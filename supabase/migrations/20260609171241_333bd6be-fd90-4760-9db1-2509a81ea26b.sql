CREATE OR REPLACE FUNCTION public.store_push_token(p_user_id uuid, p_token text, p_platform text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ownership guard: only the authenticated user may register/update their own push tokens
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot store push token for another user';
  END IF;

  INSERT INTO public.push_notification_tokens (user_id, token, platform)
  VALUES (p_user_id, p_token, p_platform)
  ON CONFLICT (token)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    platform = EXCLUDED.platform,
    updated_at = now()
  WHERE public.push_notification_tokens.user_id = auth.uid();
END;
$function$;