import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header");
    }
    
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
    if (userError || !user) {
      logStep("ERROR: Authentication failed", { error: userError });
      throw new Error("Unauthorized");
    }
    logStep("User authenticated", { userId: user.id });

    // Get subscription ID from request
    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      logStep("ERROR: No subscription ID provided");
      throw new Error("Subscription ID required");
    }
    logStep("Cancellation requested", { subscriptionId });

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

    // Cancel in Stripe (at end of period to be fair to user)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not set");
      throw new Error("Stripe configuration error");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logStep("Subscription cancelled in Stripe", { 
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEnd: canceledSubscription.current_period_end
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        subscription: {
          id: canceledSubscription.id,
          cancel_at_period_end: canceledSubscription.cancel_at_period_end,
          current_period_end: canceledSubscription.current_period_end,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-subscription", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
