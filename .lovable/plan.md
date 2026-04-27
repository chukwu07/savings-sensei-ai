# Simplify Contact Support → mailto

Goal: replace the entire email-sending pipeline with a small dialog that lets the user open their email app (or copy the address) to email `support@budgetbuddyai.co.uk` directly. No DNS, no Edge Functions, no provider in the path.

## 1. Rewrite `ContactSupportDialog`

File: `src/components/support/ContactSupportDialog.tsx`

- Strip out: react-hook-form, zod, supabase invoke, all status states, auth check, sign-in redirect.
- New behavior: small dialog showing the support email with two buttons:
  - **Open email app** → `window.location.href = "mailto:support@budgetbuddyai.co.uk?subject=BudgetBuddy%20Support%20Request"`
  - **Copy email** → `navigator.clipboard.writeText("support@budgetbuddyai.co.uk")` + toast "Email copied"
- Keep the same exported component name and `{ open, onOpenChange }` props so existing call sites in `More.tsx` and `LegalFooter.tsx` keep working unchanged.
- Works for logged-out users too (no auth gate needed).

## 2. Delete unused frontend code

- Delete `src/pages/Unsubscribe.tsx`
- Remove the `/unsubscribe` route + import from `src/App.tsx`

## 3. Delete email Edge Functions

Remove these function directories entirely:
- `supabase/functions/send-support-message/`
- `supabase/functions/send-transactional-email/`
- `supabase/functions/preview-transactional-email/`
- `supabase/functions/handle-email-unsubscribe/`
- `supabase/functions/handle-email-suppression/`
- `supabase/functions/_shared/transactional-email-templates/` (entire folder, including `registry.ts` and `support-message.tsx`)

Then call `supabase--delete_edge_functions` to remove the deployed copies.

## 4. Clean `supabase/config.toml`

Remove these blocks:
- `[functions.send-transactional-email]`
- `[functions.preview-transactional-email]`
- `[functions.handle-email-unsubscribe]`
- `[functions.handle-email-suppression]`

(Note: `send-support-message` is not currently in config.toml, so nothing to remove for it there.)

## 5. Keep intact (do NOT touch)

- `support_messages` table — keep as historical record per your note. No new rows will be written; that's fine.
- `RESEND_API_KEY` secret — leave it. It costs nothing and may be needed later.
- `notify.www.budgetbuddyai.co.uk` provisioning — leave alone; it's just sitting unused.
- `send-budget-alerts` Edge Function — unrelated to support flow, untouched.

## 6. Update memory

- Rewrite `mem://tech/email-delivery-architecture` to reflect: "Support contact uses a mailto link to support@budgetbuddyai.co.uk. No Edge Functions, no provider, no DNS in the path. The `support_messages` table is retained for historical data only."
- Update `mem://index.md` Core: replace the "App Emails: Lovable Emails only…" line with "Support contact: mailto only. No transactional email infrastructure."

## Result

- User clicks "Contact Support" → dialog → "Open email app" → their mail client opens, addressed to `support@budgetbuddyai.co.uk`
- They send → lands in your Hostinger inbox
- You reply from `support@budgetbuddyai.co.uk` → goes back to them directly
- Zero infrastructure to maintain, zero things that can break
