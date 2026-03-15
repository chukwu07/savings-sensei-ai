

# Full Premium + Referral + Commission System

## Architecture

Three premium access layers, one referral system, one commission engine — all protected by `manual_override` and `stripe_invoice_id` deduplication.

## Database Migration (1 migration, 5 changes)

### 1. `profiles` — add 3 columns
- `referral_code text UNIQUE` — auto-generated personal code
- `referrer_user_id uuid` — who invited this user (direct ID link, no string lookups)
- `referral_count integer DEFAULT 0` — quick counter

### 2. `subscribers` — add 1 column
- `manual_override boolean NOT NULL DEFAULT false`

### 3. New table: `promo_codes`
Admin-created campaign codes for influencers/promotions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| code | text UNIQUE | Uppercase, e.g. `ALICE50` |
| description | text | Internal note |
| campaign_name | text nullable | e.g. "TikTok Campaign" |
| subscription_tier | text DEFAULT 'Premium' | |
| duration_days | integer nullable | null = permanent |
| max_uses | integer nullable | null = unlimited |
| current_uses | integer DEFAULT 0 | Atomic increment |
| commission_percent | numeric DEFAULT 0 | Admin-set, 0-100 |
| referrer_user_id | uuid nullable | Influencer who owns this code |
| expires_at | timestamptz nullable | |
| is_active | boolean DEFAULT true | |
| created_by | uuid | Admin who created |
| created_at / updated_at | timestamptz | |

RLS: Admin-only CRUD via `has_role`.

### 4. New table: `promo_code_redemptions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| promo_code_id | uuid FK | |
| user_id | uuid UNIQUE | One redemption per user ever |
| redeemed_at | timestamptz DEFAULT now() | |

### 5. New table: `referral_commissions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| referrer_user_id | uuid | Who earns |
| referred_user_id | uuid | Who paid |
| promo_code_id | uuid nullable FK | Which code linked them |
| stripe_invoice_id | text UNIQUE | **Deduplication key** — prevents double commissions |
| payment_amount | numeric | |
| commission_percent | numeric | Snapshot at time of payment |
| commission_amount | numeric | payment * percent / 100 |
| status | text DEFAULT 'pending' | pending / paid |
| created_at | timestamptz | |

RLS: Admins read all. Referrers read own rows.

### Update `handle_new_user()` trigger
Auto-generate `referral_code` from user's display name or random string when profile is created.

## Edge Functions

### New: `redeem-promo-code/index.ts`
- `verify_jwt = true`
- Accepts `{ code: string }`
- Validates: exists, active, not expired, atomic `current_uses < max_uses` check
- Checks user hasn't redeemed any code (UNIQUE constraint on `user_id`)
- Upserts `subscribers` with `manual_override: true`, tier, calculated end date
- Sets `referrer_user_id` on redeemer's `profiles` row
- Increments `current_uses` atomically
- Inserts redemption record

### Update: `check-subscription/index.ts`
- After auth, query `subscribers.manual_override`
- If `true` → return existing DB values, skip Stripe API entirely

### Update: `stripe-webhook/index.ts`
- On `invoice.payment_succeeded`:
  1. Get paying user's `referrer_user_id` from `profiles`
  2. If exists, look up `commission_percent` from their `promo_codes` entry
  3. Attempt INSERT into `referral_commissions` with `stripe_invoice_id`
  4. UNIQUE constraint silently rejects duplicates — idempotent
- On subscription events: check `manual_override` before overwriting subscriber data

### Update: `supabase/config.toml`
- Add `[functions.redeem-promo-code]` with `verify_jwt = true`

## Frontend Changes

### `src/pages/Auth.tsx`
- Read `?ref=` URL param on mount, persist to localStorage
- Add optional "Referral Code" input on signup form
- After successful signup, call `redeem-promo-code` if code present
- Toast success/failure

### `src/pages/Admin.tsx` — 3 additions

**1. Grant/Revoke Premium (Users tab)**
- "Grant Premium" button → upserts `subscribers` with `manual_override: true`
- "Revoke" → sets `subscribed: false`, `manual_override: false`
- Logs to `admin_audit_logs`

**2. Promo Codes tab**
- Create code form: code, description, campaign, tier, duration, max uses, **commission %**, referrer user
- List codes with usage stats
- Toggle active/inactive

**3. Commissions section**
- Table: referrer, referred user, payment, commission %, amount, status
- Per-referrer totals (pending / paid)
- Admin can mark commissions as "paid" (batch or individual)

## Files Summary

| File | Action |
|------|--------|
| SQL migration | Add columns + create 3 tables + update trigger |
| `supabase/functions/redeem-promo-code/index.ts` | New |
| `supabase/functions/check-subscription/index.ts` | Skip Stripe when `manual_override` |
| `supabase/functions/stripe-webhook/index.ts` | Commission logging with dedup |
| `supabase/config.toml` | Register new function |
| `src/pages/Auth.tsx` | Referral code input + URL param |
| `src/pages/Admin.tsx` | Grant/Revoke + Promo Codes + Commissions |
| `supabase/functions/_shared/validation.ts` | Add promo code schema |

## Safety Measures
- `stripe_invoice_id UNIQUE` on commissions — prevents double payouts
- Atomic `current_uses` increment — prevents race conditions on code limits
- `user_id UNIQUE` on redemptions — one code per user ever
- `manual_override` — Stripe cannot overwrite manual/promo grants
- `verify_jwt = true` — only authenticated users can redeem

