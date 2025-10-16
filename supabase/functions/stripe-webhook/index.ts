import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[Stripe Webhook] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      logStep('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      logStep('Missing stripe signature');
      return new Response(
        JSON.stringify({ error: 'Missing stripe signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep('Webhook signature verified', { eventType: event.type, eventId: event.id });
    } catch (err: any) {
      logStep('Webhook signature verification failed', { error: err.message });
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the webhook event
    const { error: logError } = await supabase
      .from('stripe_webhook_logs')
      .insert({
        event_id: event.id,
        event_type: event.type,
        raw_event: event as any,
        processed: false,
      });

    if (logError) {
      logStep('Failed to log webhook event', { error: logError });
    }

    // Process the event based on type
    let processed = false;
    let errorMessage: string | null = null;

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          logStep('Processing subscription event', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
          });

          // Get customer email
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const customerEmail = (customer as Stripe.Customer).email;

          if (!customerEmail) {
            throw new Error('Customer email not found');
          }

          // Determine subscription tier based on price
          const priceId = subscription.items.data[0]?.price.id;
          const price = await stripe.prices.retrieve(priceId);
          const amount = price.unit_amount || 0;
          
          let subscriptionTier = 'free';
          if (amount >= 2000) {
            subscriptionTier = 'premium';
          } else if (amount >= 1000) {
            subscriptionTier = 'pro';
          }

          // Check if subscription is active
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';

          // Update subscriber record
          const { error: upsertError } = await supabase
            .from('subscribers')
            .upsert({
              email: customerEmail,
              stripe_customer_id: subscription.customer as string,
              subscribed: isActive,
              subscription_tier: isActive ? subscriptionTier : null,
              subscription_end: isActive && subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'email'
            });

          if (upsertError) {
            throw upsertError;
          }

          logStep('Subscription updated in database', { email: customerEmail, tier: subscriptionTier, active: isActive });
          processed = true;
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          logStep('Processing subscription deletion', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
          });

          // Get customer email
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const customerEmail = (customer as Stripe.Customer).email;

          if (!customerEmail) {
            throw new Error('Customer email not found');
          }

          // Update subscriber to remove premium access
          const { error: updateError } = await supabase
            .from('subscribers')
            .update({
              subscribed: false,
              subscription_tier: null,
              subscription_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('email', customerEmail);

          if (updateError) {
            throw updateError;
          }

          logStep('Subscription cancelled in database', { email: customerEmail });
          processed = true;
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          logStep('Payment succeeded', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amount: invoice.amount_paid,
          });
          processed = true;
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          logStep('Payment failed', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amount: invoice.amount_due,
          });
          
          // Could implement logic to notify user or handle failed payments
          processed = true;
          break;
        }

        default:
          logStep('Unhandled event type', { type: event.type });
          processed = true; // Mark as processed even if we don't handle it
      }
    } catch (err: any) {
      errorMessage = err.message;
      logStep('Error processing webhook', { error: err.message });
    }

    // Update webhook log with processing status
    await supabase
      .from('stripe_webhook_logs')
      .update({
        processed,
        error_message: errorMessage,
        customer_id: (event.data.object as any).customer,
        subscription_id: (event.data.object as any).id,
        status: (event.data.object as any).status,
      })
      .eq('event_id', event.id);

    logStep('Webhook processing complete', { eventId: event.id, processed });

    return new Response(
      JSON.stringify({ received: true, processed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Webhook handler error', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
