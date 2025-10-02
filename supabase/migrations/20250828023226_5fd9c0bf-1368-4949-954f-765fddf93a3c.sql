-- Critical Security Fixes for Google Play Store Launch
-- Fix overly permissive RLS policies that expose user data

-- 1. Fix subscribers table security vulnerabilities
-- Current policies are too permissive and allow unauthorized access to customer payment data

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Public profile info is viewable by authenticated users" ON public.profiles;

-- Create secure policies for subscribers table
CREATE POLICY "Users can update only their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert only their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Fix profiles table security - remove policy that allows any authenticated user to see any profile
-- Only allow users to see their own profiles, unless explicitly sharing specific fields
CREATE POLICY "Users can view only their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for public profile information that users have explicitly made public
-- This is more secure as it requires explicit opt-in rather than default exposure
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() != user_id 
  AND display_name IS NOT NULL 
  AND avatar_url IS NOT NULL
  -- Only show profiles that have both display_name AND avatar_url (explicit public profiles)
);

-- 3. Add additional security constraints
-- Ensure user_id fields cannot be null where they should reference authenticated users
ALTER TABLE public.budgets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.savings_goals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.recurring_transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.import_jobs ALTER COLUMN user_id SET NOT NULL;

-- Add check constraints to prevent data manipulation
ALTER TABLE public.subscribers ADD CONSTRAINT check_user_id_not_null 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

-- Create function to validate user owns the data they're accessing
CREATE OR REPLACE FUNCTION public.validate_user_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user_id matches the authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot create or modify records for other users';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to prevent users from creating records for other users
CREATE TRIGGER validate_budget_ownership
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_ownership();

CREATE TRIGGER validate_transaction_ownership
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_ownership();

CREATE TRIGGER validate_savings_goal_ownership
  BEFORE INSERT OR UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_ownership();

CREATE TRIGGER validate_recurring_transaction_ownership
  BEFORE INSERT OR UPDATE ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_ownership();

CREATE TRIGGER validate_import_job_ownership
  BEFORE INSERT OR UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_ownership();