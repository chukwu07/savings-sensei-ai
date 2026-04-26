// Send Support Message Edge Function
// Auth strategy: verify_jwt = false in config.toml; we manually validate the JWT
// here so it's the single source of truth (easier to debug than dual enforcement).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
// defence-in-depth (x-forwarded-for can be spoofed in some setups).
type Bucket = { count: number; resetAt: number };
const userBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
const HOUR = 60 * 60 * 1000;
const USER_LIMIT = 5; // primary control: 5 per hour per authenticated user
const IP_LIMIT = 20; // soft backstop only

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
  // Hash so we don't keep raw IP+UA in memory.
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

    // Use anon-key client just to validate the user token.
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

    // 4. Insert pending row using service-role client (bypasses RLS — by design)
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

    // 5. Send via Resend (through Lovable connector gateway)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!lovableKey || !resendKey) {
      const errMsg = "Email provider not configured";
      await adminClient
        .from("support_messages")
        .update({ status: "failed", error: errMsg })
        .eq("id", messageId);
      return jsonResponse({ error: errMsg }, 500);
    }

    const subjectPrefix = emailVerified ? "[Support]" : "[UNVERIFIED EMAIL] [Support]";
    const escapedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px">
        <h2 style="margin:0 0 16px">New support request</h2>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">
          <tr><td style="padding:4px 12px 4px 0;color:#666">From</td><td>${userEmail}${emailVerified ? "" : " <em>(UNVERIFIED)</em>"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">User ID</td><td><code>${user.id}</code></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Route</td><td>${route ?? "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">User-Agent</td><td style="font-size:12px;color:#666">${userAgent ?? "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Message ID</td><td><code>${messageId}</code></td></tr>
        </table>
        <h3 style="margin:0 0 8px">Subject</h3>
        <p style="margin:0 0 16px">${subject.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <h3 style="margin:0 0 8px">Message</h3>
        <div style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px">${escapedMessage}</div>
      </div>
    `;

    const emailPayload: Record<string, unknown> = {
      from: "BudgetBuddy Support <onboarding@resend.dev>",
      to: ["support@budgetbuddyai.co.uk"],
      subject: `${subjectPrefix} ${subject}`,
      html,
    };
    // Only set Reply-To when the user's email is verified — otherwise reply could be spoofed.
    if (emailVerified) {
      emailPayload.reply_to = userEmail;
    }

    let resendId: string | null = null;
    try {
      const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify(emailPayload),
      });

      const respJson = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok) {
        const errMsg = (respJson as { message?: string })?.message ?? `Resend HTTP ${resp.status}`;
        await adminClient
          .from("support_messages")
          .update({ status: "failed", error: errMsg })
          .eq("id", messageId);
        log("Resend failed", { errMsg });
        return jsonResponse({ error: "Failed to send message. Please try again." }, 502);
      }

      resendId = (respJson as { id?: string })?.id ?? null;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown send error";
      await adminClient
        .from("support_messages")
        .update({ status: "failed", error: errMsg })
        .eq("id", messageId);
      log("Resend threw", { errMsg });
      return jsonResponse({ error: "Failed to send message. Please try again." }, 502);
    }

    await adminClient
      .from("support_messages")
      .update({ status: "sent", resend_id: resendId })
      .eq("id", messageId);

    log("Sent successfully", { id: messageId, resendId });
    return jsonResponse({ ok: true, id: messageId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log("Unhandled error", { msg });
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
