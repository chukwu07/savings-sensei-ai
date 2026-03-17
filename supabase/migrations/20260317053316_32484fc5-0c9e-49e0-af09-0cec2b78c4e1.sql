
-- Backfill existing users with generated referral codes
UPDATE public.profiles
SET referral_code = upper(substr(md5(random()::text || user_id::text), 1, 8))
WHERE referral_code IS NULL;

-- Add unique constraint on referral_code
ALTER TABLE public.profiles
ADD CONSTRAINT referral_code_unique UNIQUE (referral_code);

-- Create collision-safe RPC function for on-demand code generation
CREATE OR REPLACE FUNCTION public.generate_referral_code(uid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
BEGIN
  -- Return existing code if already set
  SELECT referral_code INTO new_code FROM profiles WHERE user_id = uid;
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;

  -- Generate unique code with collision-safe loop
  LOOP
    new_code := upper(substr(md5(random()::text || uid::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
  END LOOP;

  UPDATE profiles SET referral_code = new_code WHERE user_id = uid;
  RETURN new_code;
END;
$$;
