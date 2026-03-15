
-- 1. Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;

-- 2. Add manual_override to subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

-- 3. Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  campaign_name text,
  subscription_tier text NOT NULL DEFAULT 'Premium',
  duration_days integer,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  referrer_user_id uuid,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Create promo_code_redemptions table
CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role handles inserts from edge functions

-- 5. Create referral_commissions table
CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  promo_code_id uuid REFERENCES public.promo_codes(id),
  stripe_invoice_id text UNIQUE NOT NULL,
  payment_amount numeric NOT NULL,
  commission_percent numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commissions" ON public.referral_commissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Referrers can view own commissions" ON public.referral_commissions
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);

-- 6. Update handle_new_user to generate referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_code text;
  display text;
BEGIN
  display := COALESCE(NEW.raw_user_meta_data ->> 'display_name', '');
  
  -- Generate a referral code: first 4 chars of name (uppercased) + 4 random digits
  IF length(display) > 0 THEN
    generated_code := upper(left(regexp_replace(display, '[^a-zA-Z]', '', 'g'), 4)) || floor(random() * 9000 + 1000)::text;
  ELSE
    generated_code := 'REF' || floor(random() * 900000 + 100000)::text;
  END IF;
  
  -- Handle unlikely collision by appending random chars
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = generated_code) LOOP
    generated_code := generated_code || chr(floor(random() * 26 + 65)::int);
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, referral_code)
  VALUES (NEW.id, display, generated_code);
  RETURN NEW;
END;
$$;

-- Add updated_at trigger for promo_codes
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
