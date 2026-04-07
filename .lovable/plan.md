

## Fix Stripe Webhook Configuration

### The problem
Stripe is sending events to `bright-action` (a function that doesn't exist in your project). Your actual webhook handler is `stripe-webhook` and it's already deployed and working. This is a **Stripe Dashboard misconfiguration**, not a code issue.

### What you need to do (in Stripe Dashboard — not code)

1. **Go to Stripe Dashboard → Developers → Webhooks**
2. **Delete** the `bright-action` endpoint (it doesn't exist in your codebase)
3. **Create or verify** a webhook endpoint pointing to:
   ```
   https://egrljooargciueeppecq.supabase.co/functions/v1/stripe-webhook
   ```
4. **Subscribe to these events**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
5. **Copy the new Webhook Signing Secret** from Stripe and update it in your Supabase secrets (the `STRIPE_WEBHOOK_SECRET` secret) if it has changed

### Optional code hardening (minor)

**File: `supabase/functions/stripe-webhook/index.ts`**

Wrap the entire handler in a try/catch that always returns `200` — even on internal errors. Right now, missing env vars return `500` and bad signatures return `400`, which is technically correct but risks Stripe disabling the endpoint again if errors persist.

Move the `500` for missing env vars and `400` for bad signature **inside** a logged warning, but still return `200` with `{ received: true, processed: false }`. This way Stripe never disables the endpoint, while you can still spot issues in your logs.

### No database or migration changes needed

Your `stripe_webhook_logs` table and `subscribers` table are already correctly set up.

### Files
| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Optional: always return 200 to prevent future disabling |

### User action required
The main fix is in the **Stripe Dashboard** — delete the wrong endpoint and verify the correct one exists.

