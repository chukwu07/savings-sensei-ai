

## Fix Remaining Hardcoded Text Colors for Dark Mode

### Problem
Three files still have hardcoded text colors that won't adapt in dark mode:

### Changes

**1. `src/components/BudgetAlertCard.tsx`** (lines 29-30)
- Replace `text-black` → `text-foreground` in the critical alert severity styles (2 instances)

**2. `src/pages/Auth.tsx`** (line 488)
- Replace `text-gray-500` → `text-muted-foreground` on the "Forgot Password?" link

**3. `text-white` instances** — these are all fine. They appear on colored gradient backgrounds (e.g., `bg-gradient-to-r from-amber-500`) where white text is intentionally always white regardless of theme. No changes needed.

### Files

| File | Change |
|------|--------|
| `src/components/BudgetAlertCard.tsx` | 2× `text-black` → `text-foreground` |
| `src/pages/Auth.tsx` | 1× `text-gray-500` → `text-muted-foreground` |

Three small replacements, two files.

