
-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert only their own subscription" ON subscribers;

-- Create a tightened INSERT policy that prevents self-granting premium
CREATE POLICY "Users can insert only their own unsubscribed row"
ON subscribers FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND user_id IS NOT NULL
  AND subscribed = false
  AND manual_override = false
  AND stripe_customer_id IS NULL
  AND subscription_tier IS NULL
  AND subscription_end IS NULL
  AND cancel_at_period_end IS NOT DISTINCT FROM false
);
