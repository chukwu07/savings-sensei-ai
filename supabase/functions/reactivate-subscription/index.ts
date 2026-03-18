import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSecureErrorResponse } from '../_shared/securityUtils.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { subscriptionId } = await req.json();
    if (!subscriptionId) throw new Error("No subscription ID provided");

    // Verify user owns this subscription
    const { data: subData, error: fetchError } = await supabaseClient
      .from("subscribers")
      .select("stripe_subscription_id, user_id")
      .eq("user_id", user.id)
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (fetchError || !subData) {
      logStep("ERROR: Subscription not found or unauthorized", { error: fetchError });
      throw new Error("Subscription not found or unauthorized");
    }
    logStep("Subscription ownership verified");

    logStep("Reactivating subscription", { subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Remove the cancellation by updating the subscription
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logStep("Subscription reactivated successfully", { 
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end 
    });

    // Update database using service role for privileged update
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseAdmin
      .from("subscribers")
      .update({ 
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        cancel_at_period_end: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in reactivate-subscription", { message: errorMessage });
    return createSecureErrorResponse('Failed to reactivate subscription.', 500);
  }
});
