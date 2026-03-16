

# Security Hardening: Subscribers Privilege Escalation + Referral Fraud Protection

Two security issues to address.

---

## Issue 1: CRITICAL — Subscribers Table UPDATE Policy (Security Scan Finding)

The current UPDATE policy on `subscribers` only checks `auth.uid() = user_id`. Any authenticated user can directly call:

```js
supabase.from('subscribers').update({ subscribed: true, subscription_tier: 'Premium' })
```

This grants free premium access without payment.

### Fix

Replace the broad UPDATE policy with a restricted one that only allows users to update non-sensitive fields. Subscription status changes should only happen server-side (edge functions use service role key, bypassing RLS).

**Migration SQL:**
```sql
-- Drop the existing broad UPDATE policy
DROP POLICY "Users can update only their own subscription" ON subscribers;

-- Create a restricted UPDATE policy that only allows non-payment fields
-- Users can only update their email (if needed). All subscription changes
-- must go through edge functions using the service role key.
CREATE POLICY "Users can update only safe fields on their subscription"
ON subscribers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL)
WITH CHECK (
  auth.uid() = user_id
  AND user_id IS NOT NULL
  -- Prevent users from modifying payment-sensitive columns
  -- by requiring they match existing values
  AND subscribed = (SELECT s.subscribed FROM subscribers s WHERE s.user_id = auth.uid())
  AND subscription_tier IS NOT DISTINCT FROM (SELECT s.subscription_tier FROM subscribers s WHERE s.user_id = auth.uid())
  AND subscription_end IS NOT DISTINCT FROM (SELECT s.subscription_end FROM subscribers s WHERE s.user_id = auth.uid())
  AND manual_override = (SELECT s.manual_override FROM subscribers s WHERE s.user_id = auth.uid())
  AND stripe_customer_id IS NOT DISTINCT FROM (SELECT s.stripe_customer_id FROM subscribers s WHERE s.user_id = auth.uid())
  AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT s.stripe_subscription_id FROM subscribers s WHERE s.user_id = auth.uid())
  AND cancel_at_period_end IS NOT DISTINCT FROM (SELECT s.cancel_at_period_end FROM subscribers s WHERE s.user_id = auth.uid())
);
```

This ensures all subscription mutations only happen via edge functions (which use service role key and bypass RLS entirely).

---

## Issue 2: Referral Fraud — Minimum Activity Verification

Your system already has strong protections (self-referral block, Stripe payment verification, deduplication). The biggest remaining gap is fake account farming for milestone rewards (which don't require payment).

### Fix: Add `referral_verified` flag to profiles

Only count referrals toward milestone rewards after the referred user has real activity (e.g., logged 3+ transactions).

**Migration SQL:**
```sql
ALTER TABLE profiles ADD COLUMN referral_verified boolean NOT NULL DEFAULT false;
```

**Database function** to verify referrals after activity threshold:
```sql
CREATE OR REPLACE FUNCTION check_referral_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_count integer;
  referrer uuid;
BEGIN
  -- Count transactions for this user
  SELECT count(*) INTO tx_count
  FROM transactions
  WHERE user_id = NEW.user_id;

  -- If user has 3+ transactions and isn't verified yet
  IF tx_count >= 3 THEN
    -- Check if already verified
    IF NOT (SELECT referral_verified FROM profiles WHERE user_id = NEW.user_id) THEN
      -- Get referrer
      SELECT referrer_user_id INTO referrer
      FROM profiles WHERE user_id = NEW.user_id;

      IF referrer IS NOT NULL THEN
        -- Mark as verified
        UPDATE profiles SET referral_verified = true WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on transaction insert
CREATE TRIGGER trg_check_referral_verification
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_referral_verification();
```

**Frontend change**: Update `ReferralDashboard.tsx` to show verified vs unverified referral counts. The leaderboard function already uses `referral_commissions` (payment-based), so it's already protected.

---

## Files Summary

| File | Change |
|------|--------|
| SQL migration | Fix subscribers UPDATE policy, add `referral_verified` column + verification trigger |
| `src/components/ReferralDashboard.tsx` | Show verified badge next to referred users |

No edge function changes needed — they already use service role key.

