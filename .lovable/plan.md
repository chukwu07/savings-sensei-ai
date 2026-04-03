

## Premium Upgrade Funnel for Savings Goals Limit

### What
When a free-tier user hits the 3-goal limit, show a polished upgrade dialog with emotional copy, value stacking, pricing, and a one-click path to the Stripe payment flow. No more dead-end error toasts.

### Changes

**1. `src/hooks/useSavingsGoals.ts`** — Return limit signal
- In `addGoal` catch block, detect "Free-tier limit" in error message
- Return `{ limitReached: true }` instead of showing a generic toast
- Other errors still show the error toast

**2. `src/hooks/useOfflineSavingsGoals.ts`** — Same detection
- Mirror the limit detection pattern for offline mode

**3. `src/components/SavingsGoals.tsx`** — Add upgrade dialog + payment flow
- Add `showUpgradeModal` state and `paymentDialogOpen` state
- In `handleAddGoal`, check if `addGoal` returns `{ limitReached: true }` → open upgrade dialog
- Add a `Dialog` with:
  - Emotional headline: "You've hit your goal limit"
  - Subtext: "Upgrade to keep building your financial future without limits."
  - Value stack checklist: Unlimited goals, AI insights, Advanced analytics, Priority support, Export data
  - Pricing: "Just £6.99/month or £69.99/year"
  - Primary CTA: "Upgrade to Premium" → opens `PaymentDialog`
  - Ghost dismiss: "Maybe later"
- Import and wire `PaymentDialog` with `monthlyPlan` from `getPricingPlans()`
- On payment success, call `checkSubscription()` and close both dialogs

### User Flow
```text
Tap "Add Goal" (4th) → DB rejects → Hook returns limitReached
→ Upgrade Dialog appears (emotion + benefits + price)
→ "Upgrade to Premium" → PaymentDialog (Stripe)
→ Success → dialogs close → user can create goal
```

### Files
| File | Change |
|------|--------|
| `src/hooks/useSavingsGoals.ts` | Detect free-tier limit, return signal |
| `src/hooks/useOfflineSavingsGoals.ts` | Same limit detection |
| `src/components/SavingsGoals.tsx` | Upgrade Dialog + PaymentDialog integration |

