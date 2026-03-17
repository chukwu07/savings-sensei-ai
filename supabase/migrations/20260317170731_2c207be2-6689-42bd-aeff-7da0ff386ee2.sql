-- 1. Add DELETE policy for conversation_history
CREATE POLICY "Users can delete their own conversation history"
ON conversation_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 2. Create a security-barrier view for referral commissions that hides sensitive columns
CREATE OR REPLACE VIEW public.referrer_commissions_safe
WITH (security_barrier = true)
AS
SELECT
  id,
  referrer_user_id,
  referred_user_id,
  commission_amount,
  commission_percent,
  status,
  created_at
FROM public.referral_commissions;

-- 3. Drop the existing broad SELECT policy for referrers
DROP POLICY IF EXISTS "Referrers can view own commissions" ON referral_commissions;

-- 4. Create a restricted policy that only allows referrers to see through the view
-- Re-add a referrer SELECT policy but restrict to commission-relevant columns via the view
-- Since we can't do column-level RLS, we remove direct referrer access and use the view instead
-- Referrers should query referrer_commissions_safe instead

-- Grant select on the view to authenticated users
GRANT SELECT ON public.referrer_commissions_safe TO authenticated;

-- Add RLS-like filtering via the view (view inherits table RLS when security_invoker is used)
-- But since the policy is removed, we need to ensure the view works with admin policy
-- Better approach: keep a referrer policy but only on the view
-- Actually, views don't have RLS. Let's re-add a restricted approach:
-- Re-create the referrer policy (RLS can't restrict columns), so the view is the access path

-- Enable RLS bypass for the view by making it security_invoker = false (default)
-- The view will run as the view owner (postgres) bypassing RLS
-- Then we control access via GRANT and the WHERE clause in the view definition

-- Recreate view with WHERE clause for referrer filtering
CREATE OR REPLACE VIEW public.referrer_commissions_safe
WITH (security_barrier = true)
AS
SELECT
  id,
  referrer_user_id,
  referred_user_id,
  commission_amount,
  commission_percent,
  status,
  created_at
FROM public.referral_commissions
WHERE referrer_user_id = auth.uid();
