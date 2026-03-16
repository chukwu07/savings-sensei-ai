

# Referral Dashboard + Leaderboard + Anti-Pop-up Fix

## Two tasks in one implementation.

---

## Task 1: Stop the pop-up notifications

The `useSmartAlerts` hook (line 140-147) fires toast notifications every time critical budget alerts are detected. This runs on every render cycle of the dashboard, causing repeated pop-ups.

**Fix**: Remove the automatic toast firing from `useSmartAlerts.ts`. The alerts are already displayed visually in the dashboard via `BudgetAlertCard` and `SmartAlert` components — the toasts are redundant and disruptive.

**File**: `src/hooks/useSmartAlerts.ts` — remove lines 140-147 (the toast block inside `generateBudgetAlerts`).

---

## Task 2: Referral Dashboard + Leaderboard

### Database Migration

1. **`referral_rewards` table** — admin-configurable milestone rewards
   - `id`, `referral_threshold` (int), `reward_description` (text), `reward_days` (int), `is_active` (bool), `created_at`
   - RLS: Admin-only CRUD via `has_role`

2. **`get_referral_leaderboard()` function** — `SECURITY DEFINER` function returning top 10 referrers with display_name and total earnings, bypassing RLS safely

### Frontend

**New file: `src/components/ReferralDashboard.tsx`**

Sections:
1. **Your Referral Link** — display code, copy button, share buttons (WhatsApp, Twitter/X, Email, native Web Share API)
2. **Progress bar** — "X / Y referrals — next reward: Z" using `profiles.referral_count` checked against `referral_rewards`
3. **Stats cards** — total referrals, paying users, pending earnings, total earned (from `profiles` + `referral_commissions`)
4. **Referral list** — users referred by current user (query `profiles WHERE referrer_user_id = auth.uid()` — requires adding an RLS policy for this specific case)
5. **Commission history** — table from `referral_commissions` (RLS already allows referrers to view own)
6. **Leaderboard** — top 10 via `get_referral_leaderboard()` RPC, highlight current user's rank

### RLS Addition

Need a new SELECT policy on `profiles` so users can see the `display_name` and `created_at` of users they referred:

```sql
CREATE POLICY "Referrers can view referred users"
ON profiles FOR SELECT TO authenticated
USING (referrer_user_id = auth.uid());
```

### Integration

**Update: `src/components/More.tsx`** — add a "Referrals" tab button (with a gift/users icon) to the tab bar, and a corresponding `TabsContent` rendering `<ReferralDashboard />`.

### Share Templates

Pre-built messages for each platform:
- WhatsApp/Telegram: "I'm using BudgetBuddy AI to manage my money. Try it free: https://budgetbuddyai.co.uk/?ref={CODE}"
- Twitter/X: "Managing my finances with @BudgetBuddyAI 💰 Join me: https://budgetbuddyai.co.uk/?ref={CODE}"
- Email: subject + body with referral link

---

## Files Summary

| File | Action |
|------|--------|
| SQL migration | Create `referral_rewards` table, `get_referral_leaderboard()` function, referrer SELECT policy on profiles |
| `src/hooks/useSmartAlerts.ts` | Remove auto-toast for critical alerts |
| `src/components/ReferralDashboard.tsx` | New — full referral dashboard |
| `src/components/More.tsx` | Add "Referrals" tab |

