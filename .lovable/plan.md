## Diagnosis (confirmed)

Two layered causes behind "Failed to update budget" / "Failed to update goal" and Budget hanging on load:

1. **Session-readiness race (root cause).** Page-level data hooks fire on first render before the Supabase client has the auth token attached. RLS returns 0 rows → `.single()` throws → toast.
2. **Online-only mutation paths.** Budget and Goals are the only feature pages still bypassing the offline-first layer used elsewhere — no fallback when the race hits.

Fix the race at the source *and* unify architecture.

## Layer 1 — Session stability in `AuthContext`

`src/contexts/AuthContext.tsx`

- Add `sessionReady: boolean` to the context type and provider state.
- Set `sessionReady` in **both** `getSession()` resolution and `onAuthStateChange` listener (this is the critical bit).
- Guard against duplicate init with a `useRef` so `getSession()` and the listener don't both kick off the first paint:

```ts
const initializedRef = useRef(false);

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // existing securityLogger call preserved
      setSession(session);
      setUser(session?.user ?? null);
      setSessionReady(true);
      setLoading(false);
    }
  );

  if (!initializedRef.current) {
    initializedRef.current = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setSession(null); setUser(null);
      } else if (session?.expires_at && new Date(session.expires_at * 1000) > new Date()) {
        setSession(session); setUser(session.user);
      } else {
        setSession(null); setUser(null);
      }
      setSessionReady(true);
      setLoading(false);
    });
  }

  return () => subscription.unsubscribe();
}, []);
```

`PASSWORD_RECOVERY` listener in `App.tsx` and existing `securityLogger` calls stay untouched.

## Layer 2 — Gate every data hook on `sessionReady && user`

Apply the same pattern in:
- `src/hooks/useBudgets.ts`
- `src/hooks/useSavingsGoals.ts`
- `src/hooks/useTransactions.ts`
- `src/hooks/useOfflineBudgets.ts` (gate `syncData` only — local IndexedDB reads still run)
- `src/hooks/useOfflineSavingsGoals.ts` (same)
- `src/hooks/useOfflineTransactions.ts` (same)

Pattern for online fetches (with one-shot retry for network hiccups):

```ts
const { user, sessionReady } = useAuth();

useEffect(() => {
  if (!sessionReady || !user) return;

  const run = async () => {
    try {
      await fetchData();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Fetch failed, retrying once:', err);
      setTimeout(fetchData, 500);
    }
  };
  run();
}, [user, sessionReady]);
```

Pattern for offline `syncData`:

```ts
if (!sessionReady || !user) return;
if (!navigator.onLine) return;
// proceed with Supabase sync
```

Local IndexedDB reads (`fetchBudgets`/`fetchGoals` from offline storage) still run on `user` alone so the UI is instant.

## Layer 3 — Mutation hardening

In `useBudgets.ts` and `useSavingsGoals.ts`, every `update`/`delete`:

1. Early-bail if no user.
2. Add `.eq('user_id', user.id)` alongside `.eq('id', id)`.
3. Replace `.single()` with `.maybeSingle()` and explicitly handle null:

```ts
if (!user) {
  if (import.meta.env.DEV) console.warn('No user session — aborting mutation');
  return;
}

const { data, error } = await supabase
  .from('savings_goals')
  .update(updates)
  .eq('id', id)
  .eq('user_id', user.id)
  .select()
  .maybeSingle();

if (error) {
  if (import.meta.env.DEV) console.error('Supabase update error:', error);
  throw error;
}
if (!data) {
  throw new Error('No row updated (session missing or RLS blocked)');
}
```

Free-tier limit handling for goals (`{ limitReached: true }`) is preserved.

## Layer 4 — Unify Budget & Goals through offline-first

- `src/components/BudgetManagement.tsx` — swap `useBudgets` → `useOfflineBudgets`.
- `src/components/SavingsGoals.tsx` — swap `useSavingsGoals` → `useOfflineSavingsGoals`.

API surfaces match (`budgets/goals`, `addBudget/addGoal`, `updateBudget/updateGoal`, `updateBudgetSpent/updateGoalProgress`, `deleteBudget/deleteGoal`). I'll verify on read before swapping.

Result: matches Transactions/Dashboard architecture. IndexedDB → instant UI. Supabase sync runs in background, gated on session readiness + online status.

## Files changed

- `src/contexts/AuthContext.tsx` — `sessionReady` + dedup ref
- `src/hooks/useBudgets.ts` — gate, harden 3 mutations, retry-once on fetch
- `src/hooks/useSavingsGoals.ts` — gate, harden 3 mutations, retry-once on fetch
- `src/hooks/useTransactions.ts` — gate fetch
- `src/hooks/useOfflineBudgets.ts` — gate `syncData` on `sessionReady && user && navigator.onLine`
- `src/hooks/useOfflineSavingsGoals.ts` — same
- `src/hooks/useOfflineTransactions.ts` — same
- `src/components/BudgetManagement.tsx` — switch to `useOfflineBudgets`
- `src/components/SavingsGoals.tsx` — switch to `useOfflineSavingsGoals`

No DB migrations. No RLS changes. No edge function changes. No auth provider changes. No UI redesign.

## Verification

1. Hard-refresh while logged in → immediately click Budget. Cards render, no spinner hang, no error toast.
2. Edit any budget card → success toast.
3. Edit "Jersey Island" goal → success toast.
4. Sign out → sign in with Google → repeat 2 & 3 immediately after redirect.
5. **Edge test:** log in with Google, immediately refresh, spam-click Budget/Goals — no hang, no toast, consistent data.
6. DEV console: `Auth state change: INITIAL_SESSION authenticated` appears **before** any fetch logs. No duplicate "fetching budgets" lines on first paint.

## Out of scope (next task)

Duplicate-account prevention (Google vs email) — flagged for the follow-up once this lands.
