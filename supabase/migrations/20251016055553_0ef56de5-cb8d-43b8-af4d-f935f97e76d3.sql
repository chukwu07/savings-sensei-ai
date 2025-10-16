-- Create table to log all webhook events for debugging and auditing
CREATE TABLE IF NOT EXISTS public.stripe_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  customer_id text,
  subscription_id text,
  status text,
  raw_event jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs (add admin policies as needed)
-- For now, no public access to webhook logs

-- Create index for faster lookups
CREATE INDEX idx_stripe_webhook_logs_event_id ON public.stripe_webhook_logs(event_id);
CREATE INDEX idx_stripe_webhook_logs_event_type ON public.stripe_webhook_logs(event_type);
CREATE INDEX idx_stripe_webhook_logs_created_at ON public.stripe_webhook_logs(created_at DESC);