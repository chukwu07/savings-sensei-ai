# Add Google Sign-In to Auth Flow

## Heads up

Project memory currently says **"Email/password only. No OAuth."** This plan reverses that. On approval I'll update memory so future changes don't strip the button back out.

## What you'll see

Both **Sign In** and **Create Account** screens get a `Continue with Google` button above the email field, then an `or` divider, then the existing form.

```text
┌─────────────────────────────────┐
│  [G]  Continue with Google      │
├─────────── or ──────────────────┤
│  Email                          │
│  [____________________]         │
│  Password                       │
│  [____________________]         │
│  [   Sign In   ]                │
└─────────────────────────────────┘
```

## Required setup (one-time, in Supabase + Google Cloud)

OAuth providers can't be enabled from code. After I ship the code, you'll do:

1. **Google Cloud Console** → create OAuth 2.0 Client ID (Web application)
   - Authorized JavaScript origins: `https://budgetbuddyai.co.uk`, `https://www.budgetbuddyai.co.uk`, `https://budgetbuddyai7.lovable.app`, plus the preview URL
   - Authorized redirect URI: `https://egrljooargciueeppecq.supabase.co/auth/v1/callback`
2. **Supabase Dashboard → Authentication → Providers → Google** → enable, paste Client ID + Secret
3. **Supabase Dashboard → Authentication → URL Configuration** → confirm Site URL + add preview/staging URLs to Redirect URLs

Without these, the button shows but Google sign-in fails with "provider not enabled."

## Code changes

**1. `src/pages/Auth.tsx`**
- Pull `signInWithGoogle` from `useAuth()` (already exists in `AuthContext`).
- Add `googleLoading` state and `handleGoogleSignIn` handler:
  - Disable the button + show inline spinner while pending
  - On error, detect known cases and show clearer toast copy:
    - `provider is not enabled` → "Google sign-in isn't set up yet. Please use email/password."
    - `popup` / `closed` → "Google sign-in was cancelled."
    - Anything else → generic friendly message
- Add Google button (white bg, official Google "G" SVG, full-width, 44px height per mobile standards) above the email field on both `sign-in` and `create-account` screens.
- Add `or` divider between Google button and the email form.
- Carry the existing `?redirect=` param through OAuth so post-login redirects keep working (append it to `redirectTo` in the OAuth call).

**2. `src/contexts/AuthContext.tsx`** — `signInWithGoogle` already exists. Minor tweak: accept an optional `redirectPath` so `Auth.tsx` can preserve `?redirect=`.

**3. Referral code** — already stored in `localStorage`, survives the OAuth round-trip. No change.

**4. Memory update** — update `mem://auth/authentication-method` and the Core line in `mem://index.md` to: `Email/password + Google OAuth. No email verification.`

## Accepted trade-offs

- **Account duplication**: A user who signed up with email/password and later clicks "Continue with Google" with a different email will get a separate account. Supabase auto-links only when emails match exactly. Not solving account linking now.
- **External dependency**: Adds Google Cloud + Supabase OAuth config as new failure points.

## Out of scope

- Apple Sign-In
- Account linking UI
- Any change to existing email/password flow

## After you approve

I make the code changes, then give you the exact Google Cloud + Supabase Dashboard click-path to finish setup.