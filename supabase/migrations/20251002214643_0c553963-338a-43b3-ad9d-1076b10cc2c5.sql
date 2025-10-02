-- Fix critical security issue: Budget Alert System spam vulnerability
-- Remove the insecure policy that allows anyone to insert budget alerts

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert budget alerts" ON public.budget_alerts;

-- Create a secure policy that only allows authenticated users to insert their own budget alerts
CREATE POLICY "Users can insert their own budget alerts"
ON public.budget_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add a policy for users to update their own budget alerts
CREATE POLICY "Users can update their own budget alerts"
ON public.budget_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a policy for users to delete their own budget alerts
CREATE POLICY "Users can delete their own budget alerts"
ON public.budget_alerts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON public.budget_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON public.budget_alerts(created_at DESC);