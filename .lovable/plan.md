

# Anti-Fraud Protections for Referral System

## Current Status

Checking the existing code, **none of these protections are implemented yet**:

1. **`redeem-promo-code/index.ts`** — no check for `referrer_user_id === user.id`
2. **`stripe-webhook/index.ts`** — no check for `referrer === referred` before logging commission
3. **Database** — no `CHECK` constraint preventing self-referral on `profiles`

The `stripe_invoice_id UNIQUE` deduplication and `user_id UNIQUE` on redemptions are already in place.

## Changes Required

### 1. Database migration — add self-referral constraint on `profiles`

```sql
ALTER TABLE profiles
ADD CONSTRAINT no_self_referral
CHECK (referrer_user_id IS NULL OR referrer_user_id <> user_id);
```

This is a database-level safety net — even if code fails, the DB blocks self-referrals.

### 2. `supabase/functions/redeem-promo-code/index.ts` — add self-referral check

Before setting `referrer_user_id` on the profile (around line 140), add:

```typescript
if (promoCode.referrer_user_id === user.id) {
  throw new Error("You cannot use your own referral code");
}
```

### 3. `supabase/functions/stripe-webhook/index.ts` — add self-referral guard in commission logic

After looking up `referrer_user_id` (around line 346), add:

```typescript
if (profile.referrer_user_id === subscriber.user_id) {
  logStep('Skipping self-referral commission');
  // skip — do not insert commission
}
```

### Files to modify

| File | Change |
|------|--------|
| SQL migration | Add `no_self_referral` CHECK constraint |
| `supabase/functions/redeem-promo-code/index.ts` | Block self-referral codes |
| `supabase/functions/stripe-webhook/index.ts` | Skip commission when referrer === referred |

Three small, targeted changes. No new files needed.

