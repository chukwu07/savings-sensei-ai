

# Why Budget and Goals Pages Still Show Old Items First

## Root Cause

The previous fix only updated **two** places:
1. `src/services/offlineStorage.ts` — the offline storage layer (used by `useOfflineBudgets` / `useOfflineSavingsGoals`)
2. `src/hooks/useSavingsGoals.ts` — the online Supabase hook for goals (this **was** fixed)

But the **Budget page** (`BudgetManagement.tsx`) uses the **online** hook `useBudgets`, and that hook still sorts by `category` alphabetically — not by `created_at` descending. That's why new budgets appear wherever their category falls alphabetically, not at the top.

For **Goals**, the online hook (`useSavingsGoals`) was correctly updated to `.order('created_at', { ascending: false })`. If goals still appear at the bottom, the component itself may be re-sorting or the local state update after `addGoal` appends to the end of the array before the refetch completes. I'll check and fix that too.

## Fix

### 1. `src/hooks/useBudgets.ts` (line 70)

Change the Supabase query sort from:
```ts
.order('category')
```
to:
```ts
.order('created_at', { ascending: false })
```

This ensures newly created budgets appear at the top.

### 2. `src/hooks/useSavingsGoals.ts` (line ~60, `addGoal` function)

The `addGoal` function currently appends new data to the end of the state array:
```ts
setGoals(prev => [...prev, data]);
```

Change to prepend:
```ts
setGoals(prev => [data, ...prev]);
```

This ensures the new goal appears at the top immediately, without waiting for a refetch.

### 3. `src/hooks/useBudgets.ts` (~line 100, `addBudget` function)

Same issue — check if it appends and fix to prepend.

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useBudgets.ts` | Sort by `created_at` descending; prepend new items in state |
| `src/hooks/useSavingsGoals.ts` | Prepend new items in state instead of appending |

