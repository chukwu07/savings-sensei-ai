# Phase 1 — Unblock Support Email Delivery

**Scope:** Get the Contact Support form actually delivering to `support@budgetbuddyai.co.uk` (Hostinger inbox). Nothing else. Phase 2 hardening (replay worker, correlation IDs, etc.) is deliberately out of scope and will be its own plan after we see a real email land.

**Provider decision:** Lovable Emails (not Resend domain verification). Reasons:
- Eliminates the Resend sandbox class of failure permanently
- Built-in queue, retries (429/5xx), suppression, dead-letter — most of "Phase 2" comes for free
- Clean DNS: only delegates a subdomain; root domain MX (Hostinger inbox) stays untouched

**Trade-off accepted:** Outbound `From:` becomes `support@notify.budgetbuddyai.co.uk` instead of `support@budgetbuddyai.co.uk`. `Reply-To` is set to the user's email, so replying from the Hostinger inbox still goes to the user. Functionally identical for the support workflow.

---

## Current state (verified by inspection)

- `supabase/functions/send-support-message/index.ts` sends via Resend connector gateway with `from: "BudgetBuddy Support <onboarding@resend.dev>"` → returns 403 (sandbox restriction).
- `support_messages` table exists with status state machine (`pending` / `sent` / `failed`) and stores `resend_id` + `error`. **This stays.**
- `src/components/support/ContactSupportDialog.tsx` calls `send-support-message` via `supabase.functions.invoke`. **No client changes needed.**
- An unrelated email domain exists in the workspace: `notify.amoriagift.uk` (pending DNS) — leftover from another project. We will add a new domain on the correct root: `notify.budgetbuddyai.co.uk`.

---

## What I will do (after approval)

### Step 1 — Provision Lovable Emails on `notify.budgetbuddyai.co.uk`
Trigger the email domain setup dialog so you can add the new sender domain. This produces 2 NS records that you paste into Hostinger DNS for the `notify` host. Root domain MX records (your inbox) are not touched.

### Step 2 — Set up email infrastructure
Create the queue, dispatcher, send log, suppression table, and pg_cron job that processes the queue every 5 seconds. This is a one-shot tool call — no SQL written by hand.

### Step 3 — Rewrite `send-support-message` Edge Function
Replace the Resend-via-connector send path with `supabase.functions.invoke('send-transactional-email', ...)`. Keep:
- Manual JWT validation
- Zod body validation
- Per-user (5/hour) and per-IP (20/hour) rate limiting
- `support_messages` row inserted as `pending` before send
- Status updated to `sent` / `failed` after send
- The `resend_id` column is repurposed to store the transactional run ID (or we add a new column — small migration). I'll go with: add a nullable `email_message_id text` column and stop writing to `resend_id`. No data loss.

### Step 4 — Create the support-message email template
A React Email template at `supabase/functions/_shared/transactional-email-templates/support-message.tsx`:
- **Recipient:** `support@budgetbuddyai.co.uk` (your Hostinger inbox)
- **Reply-To:** the user's email (set per-send)
- **Subject:** `[Support] {user-supplied subject}` (or `[UNVERIFIED EMAIL] [Support] …` when `email_confirmed_at` is null — preserves existing behaviour)
- **Body:** matches the current HTML — From, User ID, Route, User-Agent, Message ID, Subject, Message
- Registered in `_shared/transactional-email-templates/registry.ts` as `support-message`

### Step 5 — Deploy and smoke-test
Deploy `send-support-message` and `send-transactional-email`. Then I'll trigger one test send via the Edge Function curl tool to confirm:
- Row inserted as `pending`
- Email queued, then dispatched
- `support_messages` row updated to `sent`
- You confirm the email arrived in `support@budgetbuddyai.co.uk`

### Step 6 — Clean up
- Remove the Resend connector references from `send-support-message` (the connector itself can stay linked at workspace level — it's just unused)
- Leave `notify.amoriagift.uk` alone (it belongs to another project; not ours to remove)

---

## What you (the user) need to do

**Only one manual step:** When the email setup dialog appears, follow it to add the 2 NS records into your Hostinger DNS Zone Editor for the `notify` host. That's it. No SPF, no DKIM, no MX changes — Lovable manages all of that on the delegated subdomain.

**DNS propagation:** Can take up to 72 hours, but typically minutes-to-hours on Hostinger. The Edge Function deploy and code changes do **not** wait on DNS — once DNS verifies, queued emails start flowing automatically. If you submit a test before DNS is verified, the email queues as `pending` and sends as soon as verification completes.

---

## What is explicitly NOT in this plan (Phase 2, separate approval)

- Replay/retry worker UI
- `correlation_id` threading across submit → enqueue → send → log
- Renaming `support_messages` → `messages` (generic table)
- Splitting ingestion and delivery into two separate Edge Functions
- Rate-limit table cleanup / TTL
- Admin dashboard for failed sends
- Switching to a real broker queue (pg-boss / Supabase Queues)

We revisit those only after Phase 1 is sending real emails and you've used it for a few real support requests.

---

## Acceptance criteria

1. ✅ A signed-in user submits the Contact Support form
2. ✅ A row appears in `support_messages` with `status = 'pending'`
3. ✅ Within ~10 seconds, the row updates to `status = 'sent'`
4. ✅ The email arrives in your Hostinger inbox at `support@budgetbuddyai.co.uk`
5. ✅ Replying from Hostinger goes to the user's email (Reply-To works)
6. ✅ No 403, no Resend sandbox errors anywhere in the Edge Function logs

If any of these fails, I troubleshoot before declaring Phase 1 done.