

# Fix Referral Code for Existing Users

## Changes

### 1. SQL Migration
- Backfill existing users with generated referral codes
- Add `UNIQUE` constraint on `referral_code`
- Create `generate_referral_code(uid uuid)` RPC function with collision-safe loop (SECURITY DEFINER)

### 2. `src/components/ReferralDashboard.tsx`
- In the profile `useQuery`, if `referral_code` is null after fetch, call `supabase.rpc("generate_referral_code", { uid: user.id })` and return the result
- Show "Generating your referral code..." instead of "Loading..." when profile is loaded but code is being generated

### 3. `src/components/ReferralPrompt.tsx`
- Same RPC fallback in the `useEffect` that fetches `referral_code`

### 4. `src/integrations/supabase/types.ts`
- Add `generate_referral_code` to the RPC types

