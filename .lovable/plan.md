

# Fix Referral Share Buttons

## Root Causes

1. **Empty referral link in share URLs**: The profile query returns data, but if it hasn't loaded yet (or fails in preview), `referralLink` is empty. All share URLs then contain no link. The buttons aren't disabled while loading.

2. **WhatsApp "blocked" page**: `wa.me` redirects to `api.whatsapp.com` which blocks iframe embedding. This only happens in the Lovable preview — it works on the published site. No code fix needed, but we can improve the UX.

3. **Share button does nothing**: `navigator.share` API is not available inside iframes (preview). On the published site or mobile, it works. We should add a fallback.

## Fixes

### File: `src/components/ReferralDashboard.tsx`

1. **Guard all share buttons** — disable them when `referralLink` is empty (profile still loading)
2. **Add fallback for native Share** — if `navigator.share` is unavailable, fall back to copying the link
3. **Use `window.open` with `noopener`** for WhatsApp/Twitter/Email to improve cross-browser behavior
4. **Email: use `window.location.href` instead of `window.open`** for mailto links — `window.open` creates a blank tab on many browsers

### File: `src/components/ReferralPrompt.tsx`

Same email/WhatsApp pattern — apply consistent fixes.

## Changes

| File | Change |
|------|--------|
| `src/components/ReferralDashboard.tsx` | Disable share buttons when no referral link; fix mailto to use `location.href`; add Share fallback |
| `src/components/ReferralPrompt.tsx` | Same fixes for consistency |

