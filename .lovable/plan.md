

# Add Referral Reward Explainer to UI

## Problem
Users don't understand how they earn rewards — "Do I earn when friends sign up, use it, or pay?" This confusion reduces sharing.

## Change

### `src/components/ReferralDashboard.tsx`
Update the `CardDescription` under "Your Referral Link" to clearly explain both reward paths:

**Current:**
> "Share your unique link and earn rewards for every friend who joins"

**New:**
> "Share your link and earn rewards when friends use the app (3+ transactions). Earn extra when they upgrade to Premium."

### `src/components/ReferralPrompt.tsx`
Update the subtitle text similarly:

**Current:**
> "Join thousands improving their finances with BudgetBuddy."

**New:**
> "Earn rewards when friends log 3 transactions. Bonus for Premium upgrades."

Two small text changes, no logic changes needed.

