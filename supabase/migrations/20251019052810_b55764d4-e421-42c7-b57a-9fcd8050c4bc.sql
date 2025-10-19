-- Add explicit policy to block all anonymous access to subscribers table
-- This provides an additional security layer beyond the authenticated-only policies
CREATE POLICY "Block all anonymous access to subscribers"
ON public.subscribers
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Update table comment to document the security model
COMMENT ON TABLE public.subscribers IS 'Subscription data is strictly protected with multi-layer security: (1) Explicit anonymous access block, (2) Authenticated users can only access their own data via user_id matching, (3) Service role can manage all records for Stripe webhook integration. Email addresses and Stripe customer IDs are fully protected from unauthorized access.';