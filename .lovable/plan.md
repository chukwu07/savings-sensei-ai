## Security Hardening Pass — Minimal, Proportionate

A small migration plus two dashboard toggles. No app code, no auth rewrite.

### 1. Migration: explicit policies + DEFINER lockdown

**`user_roles` — explicit deny on self-writes**
- Add restrictive policy blocking `INSERT`/`UPDATE`/`DELETE` for `authenticated` (admin ALL policy stays for admins via `has_role`).
- Confirms scanner's "default deny" with an explicit rule.

**`referral_commissions` — explicit user read**
- Add policy: referrers can `SELECT` rows where `referrer_user_id = auth.uid()`.
- Leaves admin ALL policy intact. No one else can read.

**`promo_codes` — explicit admin-only read**
- Add restrictive policy denying `SELECT` to `authenticated` non-admins.
- Edge functions (service role) keep full access.

**`stripe_webhook_logs` — explicit write deny**
- Add restrictive policy denying `INSERT`/`UPDATE`/`DELETE` for `authenticated` and `anon`.
- Service role (webhook) unaffected.

**SECURITY DEFINER function permissions**
- `REVOKE EXECUTE ... FROM anon` on: `has_role`, `validate_user_ownership`, `validate_subscriber_user_ownership`, `check_referral_verification`, `enforce_savings_goals_limit`, `store_push_token`, `handle_new_user`, `update_updated_at_column`.
- Keep `anon` EXECUTE on `get_referral_leaderboard` (public leaderboard) and `generate_referral_code` (called during signup flow). Confirm both during implementation.

### 2. Dashboard toggles (manual, ~1 min)
- Enable **Leaked Password Protection** in Supabase Auth settings.
- Schedule **Postgres upgrade** in Supabase infrastructure settings.

### 3. Verify
- Re-run security scan.
- Confirm app still works: login, transactions, referral leaderboard, promo redemption, Stripe webhook.

### Out of scope
- No changes to auth flow, RLS for transactions/budgets/goals, or webhook code (already verifies signature).
- No defensive policies for things already working correctly.

### Technical notes
- All changes in one migration file, fully reversible.
- Restrictive policies use `AS RESTRICTIVE` so they `AND` with existing permissive policies.
- `service_role` bypasses RLS, so edge functions are unaffected.
