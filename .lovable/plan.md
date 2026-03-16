

# Remove BudgetAlertCard + Add Smart Referral Prompt

## 1. Remove BudgetAlertCard from dashboard

**`src/components/SimpleDashboard.tsx`**:
- Remove `import { BudgetAlertCard }` (line 20)
- Remove `<BudgetAlertCard />` (line 452)

## 2. Create ReferralPrompt component

**New file: `src/components/ReferralPrompt.tsx`**

A compact, dismissible card:
- Fetches user's `referral_code` from `profiles` table
- "Invite friends, earn Premium" heading with social proof text ("Join thousands improving their finances")
- Copy link button + WhatsApp share button
- Dismiss button — sets `sessionStorage` flag to hide for rest of session
- Returns `null` if no referral code or dismissed
- Uses existing `EnhancedCard`, `Button` components

## 3. Place contextually in SimpleDashboard

**`src/components/SimpleDashboard.tsx`** — add `<ReferralPrompt />` in two spots:

1. **After health score card** (line 449) — only when `healthStatus.variant === 'success'`
2. **After AI Insights panel** (line 546) — always shown when insights exist

## Files

| File | Change |
|------|--------|
| `src/components/ReferralPrompt.tsx` | New component |
| `src/components/SimpleDashboard.tsx` | Remove BudgetAlertCard, add ReferralPrompt in 2 spots |

No database changes needed.

