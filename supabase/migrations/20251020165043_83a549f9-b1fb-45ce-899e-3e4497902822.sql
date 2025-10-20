-- Add unique constraint on user_id in subscribers table to allow upsert operations
ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_user_id_key UNIQUE (user_id);