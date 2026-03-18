-- 1. Drop direct-table referrer SELECT policy to force use of safe view
DROP POLICY IF EXISTS "Referrers can view own commissions" ON referral_commissions;

-- 2. Add BEFORE INSERT trigger to enforce free-tier savings goals cap (max 3)
CREATE OR REPLACE FUNCTION public.enforce_savings_goals_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goal_count integer;
  is_subscribed boolean;
BEGIN
  -- Check if user is subscribed
  SELECT COALESCE(s.subscribed, false) INTO is_subscribed
  FROM subscribers s
  WHERE s.user_id = NEW.user_id;

  -- If not subscribed, enforce limit
  IF NOT COALESCE(is_subscribed, false) THEN
    SELECT count(*) INTO goal_count
    FROM savings_goals
    WHERE user_id = NEW.user_id;

    IF goal_count >= 3 THEN
      RAISE EXCEPTION 'Free-tier limit: maximum 3 savings goals. Upgrade to Premium for unlimited goals.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_savings_goals_limit_trigger ON savings_goals;
CREATE TRIGGER enforce_savings_goals_limit_trigger
  BEFORE INSERT ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION enforce_savings_goals_limit();