## Goal
Replace the small confirmation dialog with a direct `mailto:` action. Clicking "Contact Support" anywhere in the app will immediately open the user's email client pre-addressed to `support@budgetbuddyai.co.uk` — no popup, no extra click.

## Changes

### 1. `src/components/support/ContactSupportDialog.tsx` — rewrite as a logic-only trigger
- Remove the `Dialog`, `DialogContent`, `DialogFooter`, "Copy email" button, and toast logic.
- Keep the same exported component name and props (`open`, `onOpenChange`) so existing callers in `More.tsx` and `LegalFooter.tsx` keep working without edits.
- When `open` becomes `true`, immediately:
  1. Create a hidden `<a href="mailto:support@budgetbuddyai.co.uk?subject=BudgetBuddy%20Support%20Request">` element.
  2. Programmatically click it (this bypasses iframe sandbox issues better than `window.location.href`, the same reason we switched the button to `<a asChild>` previously).
  3. Call `onOpenChange(false)` to reset trigger state.
- Render `null` (no UI).

### 2. No changes to callers
- `src/components/More.tsx` and `src/components/legal/LegalFooter.tsx` already toggle the `open` prop — behavior just becomes "fire mailto and close" instead of "show dialog".

### 3. Memory update
- Update `mem://tech/email-delivery-architecture` to note: support flow is now a **direct mailto trigger** (no intermediate dialog, no copy-email fallback in UI).

## Trade-offs (confirming you accept these)
- ✅ One click, instant — matches your "simple and reliable" goal.
- ⚠️ If a user has no mail client configured, nothing visible happens (browser may show a chooser, or silently do nothing). Acceptable since 99%+ of devices have a default mail handler.
- ⚠️ Inside the Lovable preview iframe, mailto may still be blocked by sandbox — but it works on the published site (`budgetbuddyai.co.uk`) and on mobile, which is what real users hit.

## Out of scope
- No Edge Functions, no Resend, no DNS, no `support_messages` writes — this stays consistent with the existing memory rule.
