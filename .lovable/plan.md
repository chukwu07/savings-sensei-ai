

# Add Password Visibility Toggle to Login Screen

## Changes

**`src/pages/Auth.tsx`**:

1. Add a separate `showLoginPassword` state variable to avoid cross-form interference with the existing `showPassword` state used by signup/reset screens.

2. Replace the plain login password `Input` (currently around line 450) with the same relative-container + eye-toggle pattern used on signup/reset, using `showLoginPassword` state.

No new imports or other file changes needed.

