## Fix: "Credential not found" → Link Resend connector (final, corrected)

Single root cause: the Lovable connector gateway has no registered Resend binding for this workspace. The Edge Function, DB, auth, and rate limiting are all working — only the credential resolution step at the gateway boundary is failing. This plan fixes only that, with no DNS, UI, or architecture changes.

---

### Layer responsibilities (locked in)

| Layer | Responsibility | Success signal |
|------|----------------|----------------|
| Edge Function | Request orchestration | 2xx returned to client |
| Gateway | Credential resolution | `verify_credentials` outcome = `verified` |
| Resend | Delivery attempt | `resend_id` returned |
| Inbox | Final receipt | Best-effort, non-deterministic, out of scope |

The connector registry is the **only** source of truth for credentials. Env var presence is *not* a proxy for connector health.

---

### Step 1 — Link Resend connector (the actual fix)

Use the standard connector flow to link Resend to this project. This creates the workspace → Resend binding the gateway needs to resolve credentials at runtime. No code, DNS, or schema changes.

### Step 2 — Verify the binding (correctness gate)

Call the gateway's `verify_credentials` endpoint and treat results strictly:

| `outcome` | Action |
|-----------|--------|
| `verified` | ✅ Proceed to Step 3 |
| `skipped` | ⚠️ Do **not** treat as success. Re-run once; if still skipped, proceed cautiously and rely on Step 3 as the real test |
| `failed` | ❌ Stop. Surface error and reconnect |
| HTTP 4xx/5xx | ❌ Stop. Binding not usable |

Only `verified` is a green light. This was the key correction.

### Step 3 — End-to-end smoke test

Invoke `send-support-message` with a real test payload and confirm:
- Function returns 2xx
- `support_messages` row transitions `pending → sent`
- `resend_id` is populated (this is the gateway success boundary — not inbox arrival)

### Step 4 — Edge Function observability (resolution-based, not env-based)

Update `supabase/functions/send-support-message/index.ts` to log based on **gateway resolution outcome**, not local env presence. Env checks misrepresent connector state and contradict the registry-as-source-of-truth model.

**On Resend gateway call failure** (replace any env-based pre-check with this):
```ts
if (!resendResponse.ok) {
  const errorBody = await resendResponse.text();
  const isCredentialError =
    resendResponse.status === 401 ||
    errorBody.includes('Credential not found');

  console.error('[SEND-SUPPORT-MESSAGE] Connector resolution failed', {
    reason: isCredentialError ? 'missing_or_invalid_resend_connector' : 'gateway_error',
    connector_id: 'resend',
    http_status: resendResponse.status,
    error_body: errorBody.slice(0, 500),
    message_id: insertedRow.id,
  });
  // ... existing failure path: update row to status='failed', return error
}
```

**On success** (after `resend_id` is obtained):
```ts
console.log('[SEND-SUPPORT-MESSAGE] Connector resolved', {
  connector_id: 'resend',
  message_id: insertedRow.id,
  resend_id: resendData.id,
});
```

**Removed from previous plan:** the `Deno.env.get('RESEND_API_KEY')` pre-check. Env presence does not reflect connector binding state and would re-introduce the dual-source confusion we explicitly rejected.

### Step 5 — Race-safe audit cleanup

Update the stuck pending row (`55e50f51-...`) using `status` as primary truth, with `id` providing race protection:

```sql
UPDATE support_messages
SET status = 'failed',
    error  = 'Connector not linked at send time',
    updated_at = now()
WHERE id = '55e50f51-...'
  AND status = 'pending';
```

Drop the `resend_id IS NULL` clause — `status = 'pending'` is the authoritative signal, and `id` already protects against races.

---

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/send-support-message/index.ts` | Replace env-based guard with gateway-response-based failure log + add success resolution log |
| `support_messages` (one row) | Mark stuck pending record as failed |
| Connector registry | Link Resend (no code) |

---

### Failure mode taxonomy (for future debugging)

This fix eliminates **case 1**. The other cases are now distinguishable from logs:

1. **Missing connector** — `verify_credentials` 4xx, gateway returns "Credential not found" → relink
2. **Invalid/revoked secret** — `verify_credentials` outcome `failed` → reconnect with fresh key
3. **Rotated credential** — same as #2 → reconnect
4. **Transient gateway outage** — intermittent 5xx → retry / status page

---

### Out of scope (deferred)

- Connector health pre-check endpoint (good follow-up; not needed to ship this fix)
- Custom verified sender domain (requires DNS — explicitly off-limits per Hostinger constraint)
- Admin retry UI for `failed` rows
