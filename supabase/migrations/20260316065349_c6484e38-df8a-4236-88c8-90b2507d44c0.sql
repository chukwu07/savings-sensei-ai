
-- Issue 1: Fix subscribers UPDATE policy to prevent privilege escalation
DROP POLICY "Users can update only their own subscription" ON subscribers;

CREATE POLICY "Users can update only safe fields on their subscription"
ON subscribers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL)
WITH CHECK (
  auth.uid() = user_id
  AND user_id IS NOT NULL
  AND subscribed = (SELECT s.subscribed FROM subscribers s WHERE s.user_id = auth.uid())
  AND subscription_tier IS NOT DISTINCT FROM (SELECT s.subscription_tier FROM subscribers s WHERE s.user_id = auth.uid())
  AND subscription_end IS NOT DISTINCT FROM (SELECT s.subscription_end FROM subscribers s WHERE s.user_id = auth.uid())
  AND manual_override = (SELECT s.manual_override FROM subscribers s WHERE s.user_id = auth.uid())
  AND stripe_customer_id IS NOT DISTINCT FROM (SELECT s.stripe_customer_id FROM subscribers s WHERE s.user_id = auth.uid())
  AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT s.stripe_subscription_id FROM subscribers s WHERE s.user_id = auth.uid())
  AND cancel_at_period_end IS NOT DISTINCT FROM (SELECT s.cancel_at_period_end FROM subscribers s WHERE s.user_id = auth.uid())
);

-- Issue 2: Add referral verification system
ALTER TABLE profiles ADD COLUMN referral_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION check_referral_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_count integer;
  referrer uuid;
BEGIN
  SELECT count(*) INTO tx_count
  FROM transactions
  WHERE user_id = NEW.user_id;

  IF tx_count >= 3 THEN
    IF NOT (SELECT referral_verified FROM profiles WHERE user_id = NEW.user_id) THEN
      SELECT referrer_user_id INTO referrer
      FROM profiles WHERE user_id = NEW.user_id;

      IF referrer IS NOT NULL THEN
        UPDATE profiles SET referral_verified = true WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_referral_verification
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_referral_verification();
