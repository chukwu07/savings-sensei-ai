-- Create function to store push notification tokens
CREATE OR REPLACE FUNCTION public.store_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_platform TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_notification_tokens (user_id, token, platform)
  VALUES (p_user_id, p_token, p_platform)
  ON CONFLICT (token) 
  DO UPDATE SET 
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    updated_at = now();
END;
$$;