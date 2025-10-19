-- Drop existing policies on subscribers table
DROP POLICY IF EXISTS "Users can view only their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert only their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update only their own subscription" ON public.subscribers;

-- Recreate policies with explicit TO authenticated clause
CREATE POLICY "Users can view only their own subscription"
ON public.subscribers
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) AND (user_id IS NOT NULL));

CREATE POLICY "Users can insert only their own subscription"
ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (user_id IS NOT NULL));

CREATE POLICY "Users can update only their own subscription"
ON public.subscribers
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND (user_id IS NOT NULL))
WITH CHECK ((auth.uid() = user_id) AND (user_id IS NOT NULL));

-- Add comment explaining security
COMMENT ON TABLE public.subscribers IS 'Subscription data is strictly protected. Only authenticated users can access their own subscription information. Unauthenticated access is completely blocked to protect email addresses and subscription details.';