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
    // Authenticate the request using JWT
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.warn('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    // Create authenticated client using user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.warn('Invalid or expired JWT token');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body and verify user_id matches authenticated user
    const body = await req.json();
    const { user_id } = body;

    if (user_id !== user.id) {
      console.warn(`User ${user.id} attempted to send alert for user ${user_id}`);
      return new Response(JSON.stringify({ error: 'Forbidden: Cannot send alerts for other users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing budget alert for user ${user.id}, category: ${body.category}`);

    // Email alert logic removed - edge function now validates authenticated user only
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Budget alert validated successfully (email logic removed)' 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

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