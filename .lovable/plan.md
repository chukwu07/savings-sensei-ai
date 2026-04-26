# Plan — Subdomain DNS approach (safe for Hostinger)

## Why this works

You add Resend records on a **brand-new subdomain** (`mail.budgetbuddyai.co.uk`) only. Your existing Hostinger setup on the **root domain** (`budgetbuddyai.co.uk`) — MX records, SPF, your inbox at `support@budgetbuddyai.co.uk` — is **not touched**. The two zones are independent, so your inbox keeps working exactly as it does today.

End result:
- App sends **from** `support@mail.budgetbuddyai.co.uk` (Resend, branded, no sandbox limit)
- Your team replies **to** `support@budgetbuddyai.co.uk` (Hostinger, unchanged)
- Reply-To is set to the user's email so you reply directly to them

---

## Step 1 — You add the domain in Resend (manual, ~2 min)

1. Resend dashboard → **Domains** → **Add Domain**
2. Enter exactly: `mail.budgetbuddyai.co.uk`
3. Region: pick the closest (EU recommended for UK users)
4. Resend shows you 3–4 DNS records (TXT for SPF, CNAME for DKIM, optional MX for bounce tracking, optional DMARC)

**Leave the page open** — you'll need to paste those records into Hostinger.

---

## Step 2 — You add the records in Hostinger (manual, ~3 min)

In Hostinger → **Domains → DNS / Nameservers → DNS Zone Editor** for `budgetbuddyai.co.uk`:

For each record Resend gave you, paste the **Name** and **Value** exactly. Important Hostinger quirk:
- If Resend says Name = `mail`, you enter `mail` (Hostinger auto-appends `.budgetbuddyai.co.uk`)
- If Resend says Name = `resend._domainkey.mail`, enter exactly that (Hostinger appends the rest)
- **Do NOT touch any existing MX, A, or TXT records on the root** — only add the new ones Resend specifies

Save. Wait 1–10 minutes.

**Safety check:** None of these records have Name = `@` or Name = empty. They all start with `mail` or end with `.mail`. That's the guarantee your root domain stays untouched.

---

## Step 3 — You click "Verify" in Resend

Once verified (green checkmark), tell me and I'll do step 4.

---

## Step 4 — I update the Edge Function (one-line change)

In `supabase/functions/send-support-message/index.ts` line 196, change:

```ts
from: "BudgetBuddy Support <onboarding@resend.dev>",
```

to:

```ts
from: "BudgetBuddy Support <support@mail.budgetbuddyai.co.uk>",
```

The `to` address (`support@budgetbuddyai.co.uk`) and Reply-To logic stay exactly as they are.

Then I redeploy `send-support-message`.

---

## Step 5 — I smoke-test

- Trigger the Contact Support dialog from the app
- Check `support_messages` row goes to `status = 'sent'` with a `resend_id`
- Check the email arrives in your `support@budgetbuddyai.co.uk` Hostinger inbox
- Check Reply-To shows the user's email so you can reply directly

---

## What I need from you to start

Just two things, in this order:
1. Confirm "go ahead" so I switch out of plan mode
2. Then **you** complete Steps 1–3 (Resend dashboard + Hostinger DNS + verify)

I'll handle Steps 4–5 the moment you tell me Resend shows the domain as verified.

---

## Failure modes to know

| If this happens | Cause | Fix |
|---|---|---|
| Resend says "DNS not found" after 1 hour | Records pasted with wrong Name (e.g., included full FQDN twice) | Re-check Hostinger entries — Name should not contain `.budgetbuddyai.co.uk` |
| Hostinger inbox stops working | Only possible if you accidentally edited the root MX records | Restore root MX records to Hostinger defaults |
| Email lands in spam | DKIM not yet propagated, or DMARC missing | Wait 24h, optionally add DMARC TXT record Resend suggests |

Nothing in Step 4 (the code change) can break your inbox — it only changes what address the app sends *from*.