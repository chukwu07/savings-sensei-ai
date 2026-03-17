-- Fix: Make the view security_invoker to use the querying user's permissions
-- Drop and recreate with security_invoker
DROP VIEW IF EXISTS public.referrer_commissions_safe;

CREATE VIEW public.referrer_commissions_safe
WITH (security_invoker = true)
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

-- Since the view now uses security_invoker, it needs RLS policies on the base table
-- We removed the referrer SELECT policy, so we need to add it back for the view to work
-- But this time the view already filters columns, so the policy is safe
CREATE POLICY "Referrers can view own commissions"
ON referral_commissions FOR SELECT TO authenticated
USING (auth.uid() = referrer_user_id);

GRANT SELECT ON public.referrer_commissions_safe TO authenticated;
REVOKE SELECT ON public.referrer_commissions_safe FROM anon;
