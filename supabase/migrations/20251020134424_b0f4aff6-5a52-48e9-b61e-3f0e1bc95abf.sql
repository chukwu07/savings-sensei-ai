-- Add stripe_subscription_id column to subscribers table for proper subscription tracking
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add unique constraint to ensure one subscription per Stripe subscription ID
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_stripe_sub_unique UNIQUE (stripe_subscription_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_subscription ON public.subscribers(stripe_subscription_id);