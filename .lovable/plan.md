

## Redeploy stripe-webhook Edge Function

### What
The `STRIPE_WEBHOOK_SECRET` is already set in Supabase secrets (updated 07 Apr 2026 05:37:06). No secret needs to be added. The edge function just needs a redeploy to ensure it uses the latest secret value.

### Steps

**1. Redeploy `supabase/functions/stripe-webhook/index.ts`**
- No code changes needed — the verification logic is already correct
- A trivial whitespace or comment touch will trigger redeployment

**2. Verify**
- Send a test webhook from Stripe Dashboard
- Check edge function logs for "Webhook signature verified" message

### Files
| File | Change |
|------|--------|
| `supabase/functions/stripe-webhook/index.ts` | Trivial touch to trigger redeploy (no logic change) |

