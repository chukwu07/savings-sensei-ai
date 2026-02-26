

# Show Newly Created Items at the Top

## Problem
When a user creates a new transaction, budget, or savings goal, the item appears at the bottom of the list, forcing them to scroll down to find it.

## Root Cause
The data retrieval methods in `src/services/offlineStorage.ts` don't consistently sort by creation time (newest first):

- **Transactions**: Sorted by `date` with `.reverse()` — but `.reverse()` on a Dexie WhereClause reverses the primary key order, not the `sortBy` result. The intent is newest-first by date, but items created on the same date may appear in insertion order (oldest first).
- **Budgets**: No sorting at all (`.toArray()`) — items appear in insertion order, so new ones go to the bottom.
- **Savings Goals**: No sorting at all (`.toArray()`) — same issue.

## Solution
Sort all three collections by `created_at` descending (newest first) so newly created items always appear at the top.

### File: `src/services/offlineStorage.ts`

**Transactions (lines 119-125)** — Sort by `created_at` descending instead of relying on `.reverse().sortBy('date')`:
```ts
static async getTransactions(userId: string): Promise<LocalTransaction[]> {
  const items = await offlineDB.transactions
    .where('user_id')
    .equals(userId)
    .toArray();
  return items.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime() || 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```
This sorts by date descending first, then by creation time descending as a tiebreaker (so two transactions on the same day show the newest one first).

**Budgets (lines 158-163)** — Sort by `created_at` descending:
```ts
static async getBudgets(userId: string): Promise<LocalBudget[]> {
  const items = await offlineDB.budgets
    .where('user_id')
    .equals(userId)
    .toArray();
  return items.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

**Savings Goals (lines 196-200)** — Sort by `created_at` descending:
```ts
static async getSavingsGoals(userId: string): Promise<LocalSavingsGoal[]> {
  const items = await offlineDB.savings_goals
    .where('user_id')
    .equals(userId)
    .toArray();
  return items.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

### Also update the online-only hooks for consistency

**`src/hooks/useTransactions.ts` (line 37)** — Already sorts by `date` descending via Supabase. Add secondary sort by `created_at`:
```ts
.order('date', { ascending: false })
```
This is already correct. No change needed.

**`src/hooks/useSavingsGoals.ts` (line 37)** — Currently sorts by `deadline` ascending. Change to `created_at` descending:
```ts
.order('created_at', { ascending: false })
```

## Files Modified

| File | Change |
|------|--------|
| `src/services/offlineStorage.ts` | Sort transactions, budgets, and savings goals by newest first |
| `src/hooks/useSavingsGoals.ts` | Sort by `created_at` descending instead of `deadline` ascending |

One file changed, one minor hook adjustment. No UI component changes needed.

