## Goal

Anchor-first Contact Support with a smart fallback dialog. The native `mailto:` fires immediately on click for the 90–95% case (instant, zero friction). If — and only if — detection determines no mail app intercepted the click, a polished fallback dialog opens with **Open Gmail (web)** and **Copy email** options.

## Behavior

1. **Click Contact Support** → native `<a href="mailto:support@budgetbuddyai.co.uk?subject=...">` fires. iPhone Mail / Android chooser / Outlook / Mail.app open instantly. No UI shown.
2. **Detection runs in parallel** (600ms after click): if `document.hasFocus() && document.visibilityState === "visible"` is still true, the OS did not hand off → open fallback dialog.
3. **Fallback dialog** shows:
   - Title: *"We couldn't open your email app"*
   - Description: *"You can copy the address below or open Gmail in your browser."*
   - Click-to-copy email box: `support@budgetbuddyai.co.uk` (clicking the box copies and shows "Copied!")
   - Primary button **Open Gmail** → `https://mail.google.com/mail/?view=cm&fs=1&to=support@budgetbuddyai.co.uk&su=BudgetBuddy%20Support%20Request` in a new tab (`target="_blank" rel="noopener noreferrer"`). Closes dialog on click.
   - Secondary button **Copy email** → writes address to clipboard, swaps label to "Copied!" with check icon for ~1s, then auto-closes.
   - Close (X) always available.
4. **Mobile layout**: buttons stack `flex-col sm:flex-row`.

## Files touched

### `src/components/support/ContactSupportLink.tsx` (rewrite)

- Restore the click handler that schedules a 600ms timer; clear the timer on unmount and on dialog open.
- Detection uses **both** `document.hasFocus()` **and** `document.visibilityState === "visible"` to minimize false positives.
- Run detection only on actual click (not on render).
- Wrap each trigger in a shadcn `<Dialog>` (controlled via local `useState`). The trigger remains a real `<a href={MAILTO_HREF}>` so native mail handoff still works — the dialog's open state is set imperatively from the timeout callback, not via `DialogTrigger`.
- Build one shared `<ContactSupportFallbackDialog>` component used by both `ContactSupportRow` and `ContactSupportTextLink` so the dialog markup lives in one place.
- Keep existing `SUPPORT_EMAIL` and `MAILTO_HREF` constants. Add a `GMAIL_COMPOSE_URL` constant.
- Email box: rendered as a `<button>` (full-width, bordered, `font-mono text-sm`) so click-to-copy works and is accessible. Uses the same copy logic as the Copy email button.
- "Copied!" feedback: local `copied` state, `lucide-react` `Check` icon, resets after 1s.
- Public exports unchanged: `ContactSupportRow` (More page) and `ContactSupportTextLink` (footer). Both keep their current visual styling.

### `mem://tech/email-delivery-architecture` (update)

Record the final architecture: anchor-first `mailto:` with a 600ms `hasFocus + visibilityState` detection. On detected failure, a fallback dialog opens offering Open Gmail (web) and click-to-copy email. No backend, no edge function. Document that this replaces the previous toast fallback and the brief pure-anchor experiment.

## What this achieves

- iPhone, iPad, Android, Mac, configured Windows → instant native mail composer, no dialog ever appears.
- Windows / desktop with no mail handler → polished dialog with two guaranteed-working paths (Gmail web + clipboard copy).
- No silent failures, no friction for the majority.

## Out of scope

- No contact form, no in-app message body, no edge function.
- No analytics on which path users take (can be added later if useful).
