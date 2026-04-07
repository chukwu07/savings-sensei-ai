
You’re on the correct Stripe webhook page. The reason you can’t find it is that in Stripe Workbench, the test action is often not shown in the main Overview content area.

## What to try

### Desktop
1. Stay on this webhook destination page.
2. At the top, switch from **Overview** to **Event deliveries**.
3. Look in the **top-right area** for one of these:
   - **Send test webhook**
   - **Send test event**
   - a **three-dot menu (⋯)** with that option inside
4. If you still don’t see it, click **Edit destination** and then return to **Event deliveries** again.

### Mobile
1. Open the same webhook page.
2. Go to the **Event deliveries** tab.
3. Check the **top-right** or any **overflow / more menu (⋯)**.
4. If nothing appears, switch to Stripe’s desktop view or open Stripe on a computer, because this action is sometimes hidden on smaller screens.

## Most likely reason it’s missing
One of these is usually true:
- You’re on **Overview**, not **Event deliveries**
- Stripe has tucked it into a **⋯ menu**
- You’re not in the correct **test/sandbox mode**
- Stripe’s current UI for your account is not showing the manual test button on that endpoint view

## Fastest fallback if the button still isn’t there
Don’t block on finding the button. Test the webhook one of these ways:

### Option A — Trigger a real Stripe test event from your app
Use your app’s upgrade flow with a Stripe test card:
- Card: `4242 4242 4242 4242`
- Any future expiry
- Any CVC
- Any ZIP/postcode

That should generate real test events and hit:
`https://egrljooargciueeppecq.supabase.co/functions/v1/stripe-webhook`

### Option B — Use Stripe CLI
If you or a developer can use the CLI, trigger:
- `customer.subscription.updated`
- `checkout.session.completed`
- `invoice.payment_succeeded`

## What to verify after testing
In Supabase Edge Function logs for `stripe-webhook`, you want to see:
- `Webhook received`
- `Webhook signature verified`
- `Webhook processing complete`

## Recommended next step
Open **Event deliveries** first. If the button still isn’t visible there, use a **real test payment flow** instead — that will prove the webhook works end to end without relying on Stripe’s UI button.
