import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Use service role key to access all user data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body to determine alert type
    let alertType = 'daily_summary'; // default
    let specificAlert = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        alertType = body.type || 'daily_summary';
        specificAlert = body;
      } catch (e) {
        // Continue with default daily summary if no body
      }
    }

    console.log(`Processing ${alertType} alerts...`);

    if (alertType === 'real_time_alert' && specificAlert) {
  // Email alert logic removed
  return new Response(JSON.stringify({ success: true, message: 'Email alert logic removed.' }), { headers: corsHeaders });
    } else {
  // Email alert logic removed
  return new Response(JSON.stringify({ success: true, message: 'Email alert logic removed.' }), { headers: corsHeaders });
    }

  } catch (error) {
    console.error('Error in send-budget-alerts function:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process budget alerts',
      details: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});