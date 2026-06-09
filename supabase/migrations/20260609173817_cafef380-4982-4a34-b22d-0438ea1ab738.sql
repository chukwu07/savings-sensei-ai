
-- 1. promo_codes: explicit restrictive deny for anon
DROP POLICY IF EXISTS "Deny anon access to promo_codes" ON public.promo_codes;
CREATE POLICY "Deny anon access to promo_codes"
ON public.promo_codes
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. subscribers: prevent users from changing email away from auth.email()
DROP POLICY IF EXISTS "Subscribers email must match auth email" ON public.subscribers;
CREATE POLICY "Subscribers email must match auth email"
ON public.subscribers
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND email = auth.email());
