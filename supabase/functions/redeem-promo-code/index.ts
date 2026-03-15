import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDEEM-PROMO-CODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse body
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      throw new Error("Invalid promo code");
    }

    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 3 || cleanCode.length > 30) {
      throw new Error("Invalid promo code format");
    }
    logStep("Code received", { code: cleanCode });

    // Check if user already redeemed a code
    const { data: existingRedemption } = await supabase
      .from("promo_code_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRedemption) {
      throw new Error("You have already redeemed a promo code");
    }

    // Find the promo code
    const { data: promoCode, error: promoError } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (promoError || !promoCode) {
      throw new Error("Invalid or inactive promo code");
    }

    // Check expiry
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      throw new Error("This promo code has expired");
    }

    // Check max uses (atomic increment)
    if (promoCode.max_uses !== null) {
      if (promoCode.current_uses >= promoCode.max_uses) {
        throw new Error("This promo code has reached its maximum uses");
      }
    }

    logStep("Promo code validated", { promoCodeId: promoCode.id, tier: promoCode.subscription_tier });

    // Atomically increment current_uses with a conditional update
    const { data: updatedCode, error: incrementError } = await supabase
      .from("promo_codes")
      .update({ current_uses: promoCode.current_uses + 1 })
      .eq("id", promoCode.id)
      .eq("current_uses", promoCode.current_uses) // Optimistic lock
      .select("id")
      .maybeSingle();

    if (incrementError || !updatedCode) {
      throw new Error("Promo code is no longer available (race condition). Please try again.");
    }

    // Calculate subscription end date
    let subscriptionEnd: string | null = null;
    if (promoCode.duration_days) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + promoCode.duration_days);
      subscriptionEnd = endDate.toISOString();
    }

    // Upsert subscriber with manual_override
    const { error: subError } = await supabase
      .from("subscribers")
      .upsert({
        user_id: user.id,
        email: user.email || '',
        subscribed: true,
        subscription_tier: promoCode.subscription_tier,
        subscription_end: subscriptionEnd,
        manual_override: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      logStep("Error upserting subscriber", { error: subError });
      throw new Error("Failed to activate premium");
    }

    // Insert redemption record
    const { error: redemptionError } = await supabase
      .from("promo_code_redemptions")
      .insert({
        promo_code_id: promoCode.id,
        user_id: user.id,
      });

    if (redemptionError) {
      logStep("Error inserting redemption", { error: redemptionError });
      // Don't throw — premium is already activated
    }

    // Set referrer_user_id on the redeemer's profile if promo code has an owner
    if (promoCode.referrer_user_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ referrer_user_id: promoCode.referrer_user_id })
        .eq("user_id", user.id);

      if (profileError) {
        logStep("Error updating referrer on profile", { error: profileError });
      }

      // Increment referral_count on the referrer's profile
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("referral_count")
        .eq("user_id", promoCode.referrer_user_id)
        .single();

      if (referrerProfile) {
        await supabase
          .from("profiles")
          .update({ referral_count: (referrerProfile.referral_count || 0) + 1 })
          .eq("user_id", promoCode.referrer_user_id);
      }
    }

    logStep("Promo code redeemed successfully", {
      userId: user.id,
      promoCodeId: promoCode.id,
      tier: promoCode.subscription_tier,
    });

    return new Response(JSON.stringify({
      success: true,
      subscription_tier: promoCode.subscription_tier,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
