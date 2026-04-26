CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  resend_id TEXT,
  user_agent TEXT,
  route TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT support_messages_subject_len CHECK (char_length(subject) BETWEEN 1 AND 150),
  CONSTRAINT support_messages_message_len CHECK (char_length(message) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX idx_support_messages_status ON public.support_messages(status);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view only their own support messages
CREATE POLICY "Users can view their own support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all support messages
CREATE POLICY "Admins can view all support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- NOTE: No INSERT/UPDATE/DELETE policies for users.
-- The send-support-message Edge Function uses the service role key,
-- which bypasses RLS, so it can insert and update status freely.

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_support_messages_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();