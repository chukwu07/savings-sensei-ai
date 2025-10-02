-- Create budget_alerts table to track sent alerts and prevent duplicates
CREATE TABLE IF NOT EXISTS public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'warning_80', 'warning_90', 'exceeded_100', 'daily_summary'
  budget_allocated NUMERIC NOT NULL,
  budget_spent NUMERIC NOT NULL,
  percentage_used NUMERIC NOT NULL,
  alert_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on budget_alerts
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_alerts
CREATE POLICY "Users can view their own budget alerts" 
ON public.budget_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert budget alerts" 
ON public.budget_alerts 
FOR INSERT 
WITH CHECK (true);

-- Create conversation_history table for AI chat context
CREATE TABLE IF NOT EXISTS public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on conversation_history
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversation_history
CREATE POLICY "Users can view their own conversation history" 
ON public.conversation_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation history" 
ON public.conversation_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance (without function-based expressions)
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_category 
ON budget_alerts(user_id, category);

CREATE INDEX IF NOT EXISTS idx_conversation_history_user_created 
ON conversation_history(user_id, created_at);