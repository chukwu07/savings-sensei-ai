-- Add cancel_at_period_end column to track subscription cancellation status
ALTER TABLE subscribers 
ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;