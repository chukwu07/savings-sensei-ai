// Send Support Message Edge Function
//
// Architecture (Phase 1 — Lovable Emails delivery):
//   1. Ingestion:    manual JWT auth, Zod validation, per-user/IP rate limiting
//   2. Persistence:  insert pending row into support_messages (audit trail)
//   3. Delivery:     invoke send-transactional-email (queue-backed, retries automatic)
//   4. Status:       update support_messages with sent/failed + queue message_id
//
// We keep this function as the orchestrator (auth, validation, rate-limit,
// audit log) and delegate the actual SMTP/HTTP send to Lovable's queue
// pipeline. The `resend_id` column now stores the Lovable queue message ID.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_INBOX = "support@budgetbuddyai.co.uk";

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-SUPPORT-MESSAGE] ${step}${detailsStr}`);
};

const BodySchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(150, "Subject too long"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message too long"),
  route: z.string().max(200).optional(),
});

// In-memory rate-limit stores. Reset per cold start — acceptable for a low-volume
// support endpoint. User-id limit is the primary control; IP limit is best-effort
// defence-in-depth.
type Bucket = { count: number; resetAt: number };
const userBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
const HOUR = 60 * 60 * 1000;
const USER_LIMIT = 5;
const IP_LIMIT = 20;

function checkBucket(map: Map<string, Bucket>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || now >= cur.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count++;
  return true;
}

async function ipKey(req: Request): Promise<string> {
  const fwd = req.headers.get("x-forwarded-for") ?? "unknown";
  const ip = fwd.split(",")[0].trim();
  const ua = req.headers.get("user-agent") ?? "unknown";
  const data = new TextEncoder().encode(`${ip}|${ua}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    log("Function started");

    // 1. Manual JWT auth (single source of truth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      log("Auth failed", { err: userError?.message });
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const user = userData.user;
    const userEmail = user.email ?? null;
    if (!userEmail) {
      return jsonResponse({ error: "Account has no email on file" }, 400);
    }
    const emailVerified = !!user.email_confirmed_at;
    log("User authenticated", { userId: user.id, emailVerified });

    // 2. Rate limiting — primary user-based, secondary IP-based
    if (!checkBucket(userBuckets, user.id, USER_LIMIT, HOUR)) {
      log("User rate limited", { userId: user.id });
      return jsonResponse(
        { error: "You've sent too many messages recently. Please try again in an hour." },
        429,
      );
    }
    const ipFingerprint = await ipKey(req);
    if (!checkBucket(ipBuckets, ipFingerprint, IP_LIMIT, HOUR)) {
      log("IP rate limited");
      return jsonResponse({ error: "Too many requests. Please try again later." }, 429);
    }

    // 3. Validate body
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { subject, message, route } = parsed.data;
    const userAgent = req.headers.get("user-agent") ?? null;

    // 4. Insert pending row (audit trail / source of truth)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: inserted, error: insertError } = await adminClient
      .from("support_messages")
      .insert({
        user_id: user.id,
        user_email: userEmail,
        subject,
        message,
        status: "pending",
        user_agent: userAgent,
        route: route ?? null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      log("Insert failed", { err: insertError?.message });
      return jsonResponse({ error: "Failed to save message" }, 500);
    }
    const messageId = inserted.id;
    log("Inserted pending row", { id: messageId });

    // 5. Hand off to Lovable Emails queue via send-transactional-email.
    // The queue handles retries, rate-limit backoff, and dead-letter routing.
    const { data: sendData, error: sendError } = await adminClient.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "support-message",
          recipientEmail: SUPPORT_INBOX,
          idempotencyKey: `support-${messageId}`,
          templateData: {
            userEmail,
            userId: user.id,
            emailVerified,
            subject,
            message,
            route: route ?? null,
            userAgent,
            messageId,
          },
        },
      },
    );

    if (sendError) {
      const errMsg = sendError.message ?? "Failed to enqueue email";
      log("Enqueue failed", { errMsg });
      await adminClient
        .from("support_messages")
        .update({ status: "failed", error: errMsg.slice(0, 500) })
        .eq("id", messageId);
      return jsonResponse({ error: "Failed to send message. Please try again." }, 502);
    }

    // The transactional sender returns its queue message_id as `messageId` (camelCase).
    const queueMessageId =
      (sendData as { messageId?: string; message_id?: string })?.messageId ??
      (sendData as { messageId?: string; message_id?: string })?.message_id ??
      null;

    await adminClient
      .from("support_messages")
      .update({ status: "sent", resend_id: queueMessageId })
      .eq("id", messageId);

    log("Enqueued for delivery", { id: messageId, queueMessageId });
    return jsonResponse({ ok: true, id: messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log("Unhandled error", { msg });
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
