## Problem
On the Admin page (`src/pages/Admin.tsx`), the `TabsList` uses `grid w-full grid-cols-6` to lay out 6 tabs (Dashboard, Users, Promo Codes, Commissions, Support, Audit). At mobile widths (~390px), each cell is too narrow and the labels overlap.

## Fix
Replace the rigid 6-column grid with a horizontally scrollable tab bar on mobile, keeping the even 6-column grid on larger screens.

### Change (single edit, line 306)
```tsx
<TabsList className="w-full flex overflow-x-auto justify-start gap-1 sm:grid sm:grid-cols-6">
```
- Mobile: flex row with horizontal scroll, each `TabsTrigger` keeps its natural width so labels don't collide. Add `whitespace-nowrap` via trigger styling if needed (shadcn defaults already handle it; verify after).
- ≥ sm: original 6-column grid restored.

No other files or business logic touched — purely a presentational tweak to the admin tab bar.

## Verification
- Resize preview to 390px on `/admin`: all 6 tab labels are readable, scrollable left/right, no overlap.
- Resize to ≥640px: tabs render as evenly-spaced 6-column grid as before.
