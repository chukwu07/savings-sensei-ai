
Goal: remove the “double scrollbar” in the Admin Dashboard overlay so users see only one scroll, consistently on both mobile and desktop.

## What’s happening (root cause)
There are two different scroll mechanisms visible at the same time:

1) **Admin overlay/page scroll (browser scrollbar)**
- The Admin panel is opened as a full-screen fixed overlay (`More.tsx`), and the page itself can scroll.
- Your global CSS also styles WebKit scrollbars (`::-webkit-scrollbar-thumb` uses `--primary`), so the browser scrollbar shows as a prominent blue thumb.

2) **Nested Radix `ScrollArea` scrollbar (custom scrollbar)**
- In `Admin.tsx`, the Users list and Audit Logs list are wrapped in Radix `ScrollArea` components with a fixed height (`h-[600px]`).
- Radix renders its own scrollbar track/thumb inside the card, which appears as a second scrollbar slightly inset from the right edge.
- Result: one blue browser scrollbar + one inset Radix scrollbar = “double scroll”.

In addition, the Admin overlay currently does not explicitly **lock background scrolling**, so on some devices it may still feel like there are two scrollable layers (overlay + page behind), even if the overlay covers the UI.

## Fix approach
We’ll ensure the Admin experience has a single, predictable scroll surface by:

A) **Removing nested `ScrollArea` usage in the Admin page** (primary visible cause)
- Replace the two Radix `ScrollArea` wrappers in `src/pages/Admin.tsx` with normal content flow so the overlay/page scroll is the only scroll.
- This removes the inset Radix scrollbar entirely.
- Bonus: avoids nested scrolling, which is often frustrating on mobile.

B) **Lock background scroll when the Admin overlay is open** (prevents “two layers scrolling”)
- In `src/components/More.tsx`, add a `useEffect` that toggles `overflow: hidden` on `document.documentElement` and `document.body` while `showAdmin === true`.
- Restore previous overflow values when the overlay closes.
- Add `overscroll-contain` to the overlay container to prevent scroll chaining/bounce from propagating to the page.

## Implementation details (what will change)

### 1) `src/pages/Admin.tsx`
- Remove: `import { ScrollArea } from "@/components/ui/scroll-area";`
- Users tab:
  - Replace:
    - `<ScrollArea className="h-[600px]"> ... </ScrollArea>`
  - With:
    - `<div className="space-y-4"> ... </div>`
- Audit tab:
  - Replace:
    - `<ScrollArea className="h-[600px]"> ... </ScrollArea>`
  - With:
    - `<div className="space-y-2"> ... </div>`

Optional (recommended for scale, but can be done as a follow-up):
- Add simple pagination (“Load more”) so the page doesn’t become extremely long as user count grows, without reintroducing nested scrollbars.

### 2) `src/components/More.tsx`
- Update imports to include `useEffect`.
- Add a `useEffect`:
  - On open (`showAdmin === true`):
    - Store previous `overflow` styles for `document.documentElement` and `document.body`
    - Set both to `overflow: hidden`
  - On close/unmount:
    - Restore previous values
- Update the overlay wrapper classes:
  - Keep `fixed inset-0 ... overflow-y-auto`
  - Add `overscroll-contain`
  - (Optional) add `h-[100dvh]` to ensure correct dynamic height on mobile browsers

## How we’ll verify (quick test checklist)
1) Open Settings → Account Settings → Open Admin Panel
2) Confirm there is only one scrollbar visible on the right (no inset scrollbar inside cards).
3) Try scrolling:
   - The Admin content should scroll normally.
   - The background page behind the Admin overlay should NOT scroll.
4) Check both:
   - Desktop (laptop browser)
   - Mobile viewport (responsive mode + real phone if possible)

## Files involved
- `src/pages/Admin.tsx` (remove nested Radix ScrollArea usage that creates the second scrollbar)
- `src/components/More.tsx` (lock background scrolling + prevent scroll chaining)

## Notes / future-proofing (for “millions of users” readiness)
- Right now, the Admin “All Users” query loads all profiles and merges roles/subscriptions client-side. That won’t scale to very large user bases.
- After the scrollbar cleanup, the next step for scale is server-side pagination (Supabase `.range(...)`) or an infinite loader, plus search-by-email rather than fetching all users.
