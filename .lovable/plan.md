## Goal

Match the user's "Option 1: Direct mailto, no dialog" exactly. Click Contact Support → email app opens with To + Subject pre-filled. Nothing else — no toast, no fallback UI, no confirmation.

## Current state

The implementation is already 95% Option 1: `ContactSupportLink.tsx` renders a real `<a href="mailto:...">` so the click natively triggers the OS mail handler. The only deviation is a 600ms `setTimeout` that fires a toast ("No email app detected") if the page still has focus — that's why the user sees a toast on Windows.

## Change

Strip the fallback. Pure anchor, nothing else.

### `src/components/support/ContactSupportLink.tsx`

- Delete the `attachFallback` function entirely.
- Delete the `toast` import (sonner).
- Delete both `handleClick` handlers — no `onClick` needed.
- Keep the two exported components (`ContactSupportRow`, `ContactSupportTextLink`) and their styling exactly as-is.
- Keep the `MAILTO_HREF` constant (`mailto:support@budgetbuddyai.co.uk?subject=BudgetBuddy%20Support%20Request`).

Result: each component is just a styled `<a href={MAILTO_HREF}>{children}</a>` — no JS behavior at all.

### Memory update

Update `mem://tech/email-delivery-architecture` to record: Contact Support is a pure `mailto:` anchor with no fallback. Per user preference, no toast or dialog is shown if the OS lacks a mail handler — the browser's native behavior is accepted as-is.

## What this achieves (matches your spec)

- iPhone / iPad → Mail composer opens, To + Subject pre-filled. (unchanged)
- Mac with Mail/Outlook configured → composer opens. (unchanged)
- Android → "Open with" picker → Gmail/etc. opens pre-filled. (unchanged)
- Windows with Outlook/Thunderbird configured → composer opens. (unchanged)
- Windows with **no** mail handler → browser shows its own native prompt or silently does nothing. **No app-level toast.** (this is the change)

## What you give up

The previous build caught the "no mail app" case and offered a copy-to-clipboard toast. After this change, a Windows user without Outlook/Thunderbird/Mail configured will see nothing happen (or a tiny browser-native prompt depending on the browser). That's the explicit trade-off in your Option 1 description ("If user has no email app set up, it may fail") and you've accepted it.

## Files touched

- `src/components/support/ContactSupportLink.tsx` — strip fallback logic, keep anchors
- `mem://tech/email-delivery-architecture` — update
