
-- 1. user_roles: explicit restrictive deny on self-writes by authenticated users
CREATE POLICY "Deny non-admin role inserts"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny non-admin role updates"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny non-admin role deletes"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. referral_commissions: referrers can read their own commissions
CREATE POLICY "Referrers can view their own commissions"
  ON public.referral_commissions
  FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

-- 3. promo_codes: explicit restrictive — only admins can SELECT
CREATE POLICY "Only admins can read promo codes"
  ON public.promo_codes
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. stripe_webhook_logs: explicit deny on all writes from non-service-role
CREATE POLICY "Deny webhook log inserts"
  ON public.stripe_webhook_logs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny webhook log updates"
  ON public.stripe_webhook_logs
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "Deny webhook log deletes"
  ON public.stripe_webhook_logs
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- 5. Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_user_ownership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_subscriber_user_ownership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_referral_verification() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_savings_goals_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.store_push_token(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- Keep anon EXECUTE on public-facing functions:
--   - get_referral_leaderboard (public leaderboard display)
--   - generate_referral_code (called during signup before auth completes)
