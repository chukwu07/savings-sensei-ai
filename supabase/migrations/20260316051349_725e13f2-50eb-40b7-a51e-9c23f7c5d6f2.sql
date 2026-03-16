-- Referral rewards milestone table
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_threshold integer NOT NULL,
  reward_description text NOT NULL,
  reward_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD
CREATE POLICY "Admins can manage referral rewards"
ON public.referral_rewards FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can read active rewards
CREATE POLICY "Anyone can view active referral rewards"
ON public.referral_rewards FOR SELECT TO authenticated
USING (is_active = true);

-- Seed default milestones
INSERT INTO public.referral_rewards (referral_threshold, reward_description, reward_days) VALUES
(3, 'AI Spending Insights', NULL),
(5, '1 Month Premium', 30),
(10, '3 Months Premium', 90),
(20, '1 Year Premium', 365);

-- Leaderboard function
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard()
RETURNS TABLE (
  rank bigint,
  display_name text,
  total_earnings numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(rc.commission_amount), 0) DESC),
    p.display_name,
    COALESCE(SUM(rc.commission_amount), 0)
  FROM profiles p
  LEFT JOIN referral_commissions rc ON rc.referrer_user_id = p.user_id
  WHERE p.referral_count > 0
  GROUP BY p.user_id, p.display_name
  ORDER BY COALESCE(SUM(rc.commission_amount), 0) DESC
  LIMIT 10;
$$;

-- RLS policy so referrers can see who they referred
CREATE POLICY "Referrers can view referred users"
ON profiles FOR SELECT TO authenticated
USING (referrer_user_id = auth.uid());