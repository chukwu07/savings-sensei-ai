## In-App Support System — Final Hardened Plan

Replaces the broken `mailto:support@budgetbuddyai.co.uk` links with a real in-app messaging system: secure Edge Function + audit table + Resend delivery + clean UX. Incorporates all six correctness fixes from review.

---

### 1. Database — `support_messages` audit table

Migration creates:

```sql
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text not null,
  subject text not null,
  message text not null,
  status text not null default 'pending', -- 'pending' | 'sent' | 'failed'
  error text,
  resend_id text,
  user_agent text,
  route text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;
```

**RLS — corrected per review point #1:**
- ✅ Users can **SELECT** their own rows only
- ✅ Admins can **SELECT** all rows (via `has_role(auth.uid(), 'admin')`)
- ❌ **No user INSERT policy** — inserts are performed by the Edge Function using the service role, which bypasses RLS
- ❌ No UPDATE/DELETE for users

**Status lifecycle (review point #6) — explicitly defined:**
- `pending` = row inserted, Resend call not yet attempted or in flight
- `sent` = Resend returned success (`resend_id` populated)
- `failed` = Resend returned error or threw (`error` populated)

---

### 2. Edge Function — `supabase/functions/send-support-message/index.ts`

**Config (review point #2):** registered in `supabase/config.toml` with `verify_jwt = false`. Auth is enforced **manually in code** as the single source of truth — no double enforcement, easier debugging.

**Flow:**
1. Handle CORS preflight
2. Read `Authorization: Bearer <jwt>` header → 401 if missing
3. Create user-scoped client → `supabase.auth.getUser(token)` → 401 if invalid
4. **Email verification check (review point #4):** require `user.email_confirmed_at != null`. If unverified, still send the email but **omit the `Reply-To` header** and prepend a `[UNVERIFIED EMAIL]` tag to the subject so support staff don't reply to a spoofable address
5. Validate body with Zod:
   - `subject`: trimmed, 1–150 chars
   - `message`: trimmed, 1–2000 chars
   - `route` (optional): string, ≤200 chars (review point — bonus context)
6. **Rate limiting (review point #3):**
   - **Primary:** per-`user_id`, 5 messages / hour (this is the real control)
   - **Defence-in-depth only:** per-IP backstop using hash of `x-forwarded-for + user-agent`, 20 / hour. Documented in code comments as best-effort, not a security boundary
7. Insert row into `support_messages` with `status = 'pending'` using **service-role client**
8. Send via Resend gateway (per house Resend pattern using `LOVABLE_API_KEY` + `RESEND_API_KEY`):
   - `from`: `BudgetBuddy Support <onboarding@resend.dev>` (until a verified domain is wired up)
   - `to`: `support@budgetbuddyai.co.uk`
   - `reply_to`: user email **only if email_confirmed_at is set**
   - Subject: `[Support] <subject>` (or `[UNVERIFIED EMAIL] [Support] <subject>`)
   - HTML body: user email, user_id, route, user-agent, then message
9. Update row → `status = 'sent'` + `resend_id`, or `status = 'failed'` + `error`
10. Return `{ ok: true, id }` (200) or sanitized error (4xx/5xx) with CORS headers on every response

---

### 3. UI — `src/components/support/ContactSupportDialog.tsx`

Shadcn `Dialog` containing a `react-hook-form` + Zod form (subject + message), with these states:
- **Unauthenticated:** show "Log in to contact support" with a button that navigates to `/auth?redirect=<current-path>` (review point #5 — return-path handling so users land back where they were)
- **Idle:** form visible, char counters, helper line *"We usually respond within 24 hours."*
- **Submitting:** disabled inputs, inline "Sending…" state on the button
- **Success:** replace form with a confirmation block *"Message sent ✓ — we've received your message and will reply by email."* + Close button
- **Error:** inline error banner above the form with a Retry action

The component reads `window.location.pathname` and the navigator user-agent and includes them in the request payload as `route` for support context (review bonus suggestion #3).

It also needs to handle the `?redirect=...` param on `/auth` — `src/pages/Auth.tsx` will be updated to read the param and navigate back to that path on successful sign-in (falling back to `/` if absent or unsafe).

---

### 4. Integration points

- `src/components/More.tsx` — replace the `<a href="mailto:…">` with a button that opens `<ContactSupportDialog />`
- `src/components/legal/LegalFooter.tsx` — same replacement; works on public/legal pages, where it will show the "Log in to contact support" state cleanly (no dead end)
- `src/pages/Auth.tsx` — honour `?redirect=<path>` query param after sign-in (validated to be a same-origin relative path)

---

### 5. Files changed

| File | Change |
|------|--------|
| `supabase/migrations/<timestamp>_support_messages.sql` | Create table + RLS (SELECT-only for users/admins; no user INSERT) |
| `supabase/functions/send-support-message/index.ts` | New function (manual JWT auth, dual rate limit, email-verified reply-to, status lifecycle) |
| `supabase/config.toml` | Register function with `verify_jwt = false` |
| `src/components/support/ContactSupportDialog.tsx` | New dialog component with all UX states |
| `src/components/More.tsx` | Replace mailto link with dialog trigger |
| `src/components/legal/LegalFooter.tsx` | Replace mailto link with dialog trigger |
| `src/pages/Auth.tsx` | Honour `?redirect=` param after sign-in |

---

### 6. Review-point coverage checklist

| # | Issue | Resolution |
|---|------|------------|
| 1 | RLS INSERT misconfig | No user INSERT policy; service role inserts only |
| 2 | Double JWT enforcement | `verify_jwt = false` + manual `getUser()` only |
| 3 | Fragile IP rate limit | User-id is primary; IP is documented defence-in-depth |
| 4 | Reply-to spoof risk | Only set Reply-To when `email_confirmed_at` is non-null; tag subject otherwise |
| 5 | Lost context after login | `/auth?redirect=<path>` round-trip |
| 6 | Ambiguous status | `pending` / `sent` / `failed` semantics defined and enforced |

---

### Out of scope (deferred polish)

These were good suggestions but deliberately not in this plan to keep scope tight:
- Admin dashboard view of `support_messages`
- Cron-based retry of `failed` rows
- Verified custom sending domain (still using `onboarding@resend.dev` for now)

Happy to add any of them as a follow-up once this ships.