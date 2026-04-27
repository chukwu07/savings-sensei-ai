## Goal

Make "Contact Support" reliably open the user's email app on **desktop** (currently silent) by using a real `<a href="mailto:...">` rendered inside the actual button — the only approach guaranteed to satisfy the browser's user-gesture requirement. Add a graceful fallback for desktops with no mail handler.

## Approach: Option A — anchor at call sites

Stop using a state-driven trigger component. Render the `mailto:` link directly inside each "Contact Support" button using shadcn's `asChild` pattern, so the click event itself **is** the navigation event. No `useEffect`, no `useLayoutEffect`, no `window.location`.

## Changes

### 1. New helper component: `src/components/support/ContactSupportLink.tsx`

A small presentational wrapper that renders a Button-styled anchor with the mailto and a focus-loss fallback. Props: `children`, `className`, `variant`, plus pass-through.

```tsx
<Button asChild variant={variant} className={className}>
  <a href={MAILTO_HREF} onClick={handleFallback}>{children}</a>
</Button>
```

Where:
- `MAILTO_HREF = "mailto:support@budgetbuddyai.co.uk?subject=BudgetBuddy%20Support%20Request"`
- `handleFallback` schedules a 600ms timer; if `document.hasFocus()` is still true (no mail app intercepted), show a toast: *"No email app detected. Copy support@budgetbuddyai.co.uk"* with a "Copy" action button that writes the address to the clipboard.

Also export a non-Button variant (`ContactSupportTextLink`) for the legal footer's text-link style — same anchor + fallback logic, different className.

### 2. Update call sites

**`src/components/More.tsx`**
- Remove `supportOpen` state, `setSupportOpen`, and the `<ContactSupportDialog ... />` mount.
- Replace the row at line ~407 (currently a `<button onClick={() => setSupportOpen(true)}>`) with the new `ContactSupportLink` styled to look identical to the existing row (Mail icon + "Contact Support" + "Send us a message in-app" subtext). Keep the same enhanced-card row layout — just swap the outer interactive element from `<button>` to the anchor-wrapped Button.

**`src/components/legal/LegalFooter.tsx`**
- Remove `supportOpen` state and `<ContactSupportDialog ... />`.
- Replace the `<button onClick={() => setSupportOpen(true)}>Contact Support</button>` with `<ContactSupportTextLink>Contact Support</ContactSupportTextLink>` using the same `text-sm text-muted-foreground hover:text-primary transition-colors` styling.

### 3. Delete `src/components/support/ContactSupportDialog.tsx`

No longer used after the two call sites are migrated.

### 4. Update copy in `More.tsx`

The current subtext says "Send us a message in-app" — that's now misleading. Change to "Email us at support@budgetbuddyai.co.uk".

### 5. Memory update

Update `mem://tech/email-delivery-architecture` to record:
- Contact Support is a **direct anchor `mailto:` link** rendered in the button itself (no effect-driven trigger, no dialog).
- Desktop fallback: focus-check toast with copy-to-clipboard.
- Android "Open with" picker is OS-level and not suppressible.

## Why this fixes desktop

Browsers (Chrome/Edge) require `mailto:` navigation to originate from a real user gesture in the same event tick. A native `<a href="mailto:...">` click satisfies this 100% of the time. State → render → effect does not.

## What stays the same (mobile)

- **iOS**: tap → Mail compose with To and Subject pre-filled (your second screenshot). Unchanged.
- **Android**: tap → "Open with" picker (your first screenshot) → after selecting an app, user lands on the pre-filled compose screen. This OS picker cannot be bypassed by web code.

## Files touched

- `src/components/support/ContactSupportLink.tsx` — new
- `src/components/More.tsx` — swap trigger, remove state, update subtext
- `src/components/legal/LegalFooter.tsx` — swap trigger, remove state
- `src/components/support/ContactSupportDialog.tsx` — delete
- `mem://tech/email-delivery-architecture` — update