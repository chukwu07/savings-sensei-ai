-- Fix critical security issues for Play Store launch

-- 1. Fix subscribers table RLS policy - remove email-based access vulnerability
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

CREATE POLICY "Users can view only their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Remove public profile viewing policy - privacy vulnerability
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Keep only the policy that allows users to view their own complete profile
-- The remaining policies already restrict access to own profile only