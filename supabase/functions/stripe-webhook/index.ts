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
      logStep('[Internal] Webhook signature verification failed', { error: err.message });
      return new Response(
        JSON.stringify({ error: 'Webhook verification failed' }),
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
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const userId = paymentIntent.metadata.supabase_user_id;
      const priceId = paymentIntent.metadata.price_id;
      const customerId = paymentIntent.customer as string;

      if (!userId || !priceId) {
        console.error('Missing metadata in payment intent');
        break;
      }

      // Create subscription after successful payment
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          supabase_user_id: userId,
        },
      });

      // Update subscriber record
      const subscriptionEnd = new Date(subscription.current_period_end * 1000);
      
      const { error: upsertError } = await supabase
        .from('subscribers')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: 'premium',
          subscription_start: new Date(subscription.created * 1000).toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });

      if (upsertError) {
        console.error('Error upserting subscriber:', upsertError);
      }

      console.log('✅ Subscription created after payment:', subscription.id);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Get user_id from subscription metadata (set in create-checkout)
          const userId = subscription.metadata.supabase_user_id;
          
          logStep('Processing subscription event', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            userId: userId || 'NOT_FOUND',
          });

          if (!userId) {
            // If no user_id in metadata, try to find existing subscriber by stripe_customer_id
            const { data: existingSubscriber } = await supabase
              .from('subscribers')
              .select('user_id')
              .eq('stripe_customer_id', subscription.customer as string)
              .single();
            
            if (!existingSubscriber?.user_id) {
              logStep('Warning: No user_id in subscription metadata and no existing subscriber found');
              // Skip processing - this subscription cannot be linked to a user
              processed = true;
              break;
            }
            
            // Use the user_id from existing subscriber
            const existingUserId = existingSubscriber.user_id;
            
            // Get customer email for logging
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            const customerEmail = (customer as Stripe.Customer).email;

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

            const isActive = subscription.status === 'active' || subscription.status === 'trialing';

            const { error: upsertError } = await supabase
              .from('subscribers')
              .upsert({
                user_id: existingUserId,
                email: customerEmail || '',
                stripe_customer_id: subscription.customer as string,
                stripe_subscription_id: subscription.id,
                subscribed: isActive,
                subscription_tier: isActive ? subscriptionTier : null,
                subscription_end: isActive && subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000).toISOString()
                  : null,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id'
              });

            if (upsertError) {
              throw upsertError;
            }

            logStep('Subscription updated via existing subscriber', { userId: existingUserId, tier: subscriptionTier, active: isActive });
            processed = true;
            break;
          }

          // User ID found in metadata - process normally
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const customerEmail = (customer as Stripe.Customer).email;

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

          // Update subscriber record using user_id as the key
          const { error: upsertError } = await supabase
            .from('subscribers')
            .upsert({
              user_id: userId,
              email: customerEmail || '',
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              subscribed: isActive,
              subscription_tier: isActive ? subscriptionTier : null,
              subscription_end: isActive && subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            });

          if (upsertError) {
            throw upsertError;
          }

          logStep('Subscription updated in database', { userId, tier: subscriptionTier, active: isActive });
          processed = true;
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Get user_id from subscription metadata
          const userId = subscription.metadata.supabase_user_id;
          
          logStep('Processing subscription deletion', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            userId: userId || 'NOT_FOUND',
          });

          if (!userId) {
            // Try to find subscriber by stripe_customer_id
            const { data: existingSubscriber, error: findError } = await supabase
              .from('subscribers')
              .select('user_id')
              .eq('stripe_customer_id', subscription.customer as string)
              .single();
            
            if (findError || !existingSubscriber?.user_id) {
              logStep('Warning: Cannot find subscriber to delete - no user_id in metadata or database');
              processed = true;
              break;
            }

            // Update subscriber to remove premium access using user_id
            const { error: updateError } = await supabase
              .from('subscribers')
              .update({
                subscribed: false,
                subscription_tier: null,
                subscription_end: null,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', existingSubscriber.user_id);

            if (updateError) {
              throw updateError;
            }

            logStep('Subscription cancelled via existing subscriber', { userId: existingSubscriber.user_id });
            processed = true;
            break;
          }

          // Update subscriber to remove premium access using user_id
          const { error: updateError } = await supabase
            .from('subscribers')
            .update({
              subscribed: false,
              subscription_tier: null,
              subscription_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            throw updateError;
          }

          logStep('Subscription cancelled in database', { userId });
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

          // Commission logic: find who referred the paying user
          try {
            // Find the user_id for this customer
            const { data: subscriber } = await supabase
              .from('subscribers')
              .select('user_id')
              .eq('stripe_customer_id', invoice.customer as string)
              .maybeSingle();

            if (subscriber?.user_id) {
              // Get the referrer from profiles
              const { data: profile } = await supabase
                .from('profiles')
                .select('referrer_user_id')
                .eq('user_id', subscriber.user_id)
                .maybeSingle();

              if (profile?.referrer_user_id && profile.referrer_user_id !== subscriber.user_id) {
                // Find the promo code that links them (for commission %)
                const { data: redemption } = await supabase
                  .from('promo_code_redemptions')
                  .select('promo_code_id')
                  .eq('user_id', subscriber.user_id)
                  .maybeSingle();

                let commissionPercent = 0;
                let promoCodeId: string | null = null;

                if (redemption?.promo_code_id) {
                  const { data: promoCode } = await supabase
                    .from('promo_codes')
                    .select('id, commission_percent')
                    .eq('id', redemption.promo_code_id)
                    .maybeSingle();

                  if (promoCode) {
                    commissionPercent = promoCode.commission_percent || 0;
                    promoCodeId = promoCode.id;
                  }
                }

                if (commissionPercent > 0) {
                  const paymentAmount = (invoice.amount_paid || 0) / 100; // Convert from cents
                  const commissionAmount = paymentAmount * commissionPercent / 100;

                  // Insert commission — UNIQUE on stripe_invoice_id prevents duplicates
                  const { error: commError } = await supabase
                    .from('referral_commissions')
                    .insert({
                      referrer_user_id: profile.referrer_user_id,
                      referred_user_id: subscriber.user_id,
                      promo_code_id: promoCodeId,
                      stripe_invoice_id: invoice.id,
                      payment_amount: paymentAmount,
                      commission_percent: commissionPercent,
                      commission_amount: commissionAmount,
                      status: 'pending',
                    });

                  if (commError) {
                    // UNIQUE violation = already processed (idempotent)
                    if (commError.code === '23505') {
                      logStep('Commission already logged (dedup)', { invoiceId: invoice.id });
                    } else {
                      logStep('Error logging commission', { error: commError });
                    }
                  } else {
                    logStep('Commission logged', {
                      referrer: profile.referrer_user_id,
                      amount: commissionAmount,
                      percent: commissionPercent,
                    });
                  }
                }
              }
            }
          } catch (commErr: any) {
            logStep('Commission processing error (non-fatal)', { error: commErr.message });
          }

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
      logStep('[Internal] Error processing webhook', { error: err.message });
      console.error('[Internal] Webhook processing error:', err);
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
    logStep('[Internal] Webhook handler error', { error: error.message });
    console.error('[Internal] Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
