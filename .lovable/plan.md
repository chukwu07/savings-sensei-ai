

# Fix Password Reset Flow

## Root Cause

Two issues are causing the "localhost" redirect and expired OTP errors:

### Issue 1: Wrong `redirectTo` URL
In `src/pages/Auth.tsx` line 182, the redirect URL is:
```
redirectTo: `${window.location.origin}/`
```
This sends users to the root `/` path. But the app doesn't have a dedicated `/reset-password` route -- it uses a tab-based SPA. When Supabase appends the recovery token to `/`, the `AppContent` component doesn't detect the recovery state reliably, and the token can expire before the user gets to the reset form.

**However, the bigger problem is on the Supabase side.** The auth logs show the redirect going to `localhost:3000`, which means the **Supabase project's Site URL is set to `http://localhost:3000`** instead of the production URL (`https://budgetbuddyai7.lovable.app`). This is a Supabase dashboard setting, not a code issue.

### Issue 2: OTP Expiry
The auth logs confirm: `"error":"One-time token not found"` / `"Email link is invalid or has expired"`. This happens because:
1. The redirect goes to `localhost:3000` (unreachable in production)
2. By the time the user tries again or the link is clicked a second time, the OTP has expired

## Fix Plan

### 1. Update Supabase Site URL (Manual -- cannot be done via code)
The user must go to the Supabase dashboard:
- **Authentication > URL Configuration > Site URL**
- Change from `http://localhost:3000` to `https://budgetbuddyai7.lovable.app`
- Also add `https://budgetbuddyai7.lovable.app` to **Redirect URLs** if not already there

### 2. Fix `redirectTo` in code (`src/pages/Auth.tsx`, line 182)
Change the redirect to point to a proper reset-password path:
```typescript
redirectTo: `${window.location.origin}/reset-password`,
```

### 3. Add `/reset-password` route (`src/App.tsx`)
Add a dedicated route that renders the Auth component in reset-password mode, so the recovery token in the URL hash is properly handled:
```tsx
<Route path="/reset-password" element={
  <Suspense fallback={<LoadingFallback />}>
    <Auth />
  </Suspense>
} />
```

### 4. Update Auth.tsx to detect recovery from URL hash
On mount, check if the URL contains `type=recovery` in the hash fragment (which Supabase appends). If so, automatically show the reset-password screen. The existing `onAuthStateChange` PASSWORD_RECOVERY detection in `AppContent` should also work, but having it in Auth.tsx directly is more reliable.

## Summary
- **Manual action required**: Update Supabase Site URL from `localhost:3000` to the published URL
- **Code changes**: Fix `redirectTo` path, add `/reset-password` route, improve recovery detection

