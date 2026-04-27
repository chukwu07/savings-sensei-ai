# Stripe Trust Layer — 3 Scoped Edits

Add a minimal, conversion-aware trust layer for Stripe at the moments that matter (checkout + legal docs). No dashboard branding, no footer noise, no logos.

## What changes (user-facing)

### 1. PaymentDialog — trust line under the form
A single muted line appears at the bottom of the subscribe dialog, right under the payment form:

> Secure checkout • Payments powered by Stripe

- Small, muted text (`text-xs text-muted-foreground`), centered.
- "Stripe" links to `https://stripe.com` (new tab, `rel="noopener noreferrer"`).
- Only renders when `clientSecret && !error` (hidden during loading and error states).

### 2. Privacy Policy — replace generic Stripe bullet with a clear payments paragraph
Section 7 ("Third-Party Services") currently lumps Stripe in a generic bullet list. Replace that Stripe bullet with a dedicated paragraph that clearly states:

- Payments are processed by Stripe, Inc.
- We do not store card details on our servers.
- Stripe is PCI-DSS Level 1 certified and handles all sensitive card data.
- We receive only a non-sensitive token plus subscription metadata.
- Link to Stripe's Privacy Policy (`https://stripe.com/privacy`).

OpenAI and Supabase bullets remain unchanged.

### 3. Terms of Service — one billing-section line
In Section 5 ("Premium Subscription"), append one short paragraph after the existing bullet list:

> Payments are processed securely by Stripe, Inc.; we do not store your card details.

That's it — no other Terms changes.

## What we are NOT doing (intentionally)

- No Stripe branding on Dashboard, Home, More, or Settings.
- No "Powered by Stripe" in the footer.
- No Stripe logo / SVG anywhere.
- No mention on the Landing or About surfaces.

## Technical details

**Files edited (3):**

1. `src/components/premium/PaymentDialog.tsx`
   - Add a small `<p>` element inside the scrollable content area, after the `<Elements>` block, rendered only when `clientSecret && !error`:
     ```tsx
     {clientSecret && !error && (
       <p className="text-xs text-center text-muted-foreground pt-2">
         Secure checkout • Payments powered by{" "}
         <a
           href="https://stripe.com"
           target="_blank"
           rel="noopener noreferrer"
           className="underline hover:text-foreground"
         >
           Stripe
         </a>
       </p>
     )}
     ```

2. `src/pages/PrivacyPolicy.tsx`
   - In Section 7, remove the `<li>Stripe for payment processing</li>` bullet.
   - Below the remaining `<ul>` (OpenAI + Supabase), add:
     ```tsx
     <div className="mt-4">
       <h3 className="font-semibold text-foreground mb-1">Payment processing (Stripe)</h3>
       <p>
         All subscription payments are processed by Stripe, Inc. We do not
         store your card details on our servers. Stripe is PCI-DSS Level 1
         certified and handles all sensitive payment data on its own
         infrastructure. When you subscribe, your card information is sent
         directly to Stripe and we receive only a non-sensitive token plus
         subscription metadata (plan, status, billing dates). For details on
         how Stripe processes your data, see the{" "}
         <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
           Stripe Privacy Policy
         </a>.
       </p>
     </div>
     ```

3. `src/pages/TermsOfService.tsx`
   - In Section 5 ("Premium Subscription"), after the existing `<ul>`, add:
     ```tsx
     <p className="mt-2">
       Payments are processed securely by Stripe, Inc.; we do not store your
       card details.
     </p>
     ```

**No new dependencies. No new components. No memory updates required** — existing `mem://tech/payment-architecture` already covers Stripe handling; this just surfaces it at the right moments.

## Risk

- Zero runtime risk — all changes are static markup additions.
- No impact on payment flow, Stripe Elements, webhooks, subscriptions, or RLS.
- Safe to ship as a single change.
