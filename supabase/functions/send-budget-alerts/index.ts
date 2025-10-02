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

// Email alert logic removed
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select(`
      user_id,
      display_name
    `);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw usersError;
  }

  console.log(`Found ${users?.length || 0} users to check`);

  let summariesSent = 0;

  for (const user of users || []) {
    try {
      // Get user's budgets with current spending
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.user_id);

      if (budgetsError || !budgets?.length) {
        continue;
      }

      // Calculate current spending for each budget
      const budgetSummaries = [];
      
      for (const budget of budgets) {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.user_id)
          .eq('category', budget.category)
          .eq('type', 'expense')
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

        const currentSpent = transactions?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
        const percentUsed = (currentSpent / budget.allocated) * 100;

        budgetSummaries.push({
          category: budget.category,
          allocated: budget.allocated,
          spent: currentSpent,
          percentUsed: percentUsed.toFixed(1),
          status: percentUsed >= 100 ? 'exceeded' : percentUsed >= 80 ? 'warning' : 'good'
        });
      }

      // Send daily summary email
      await sendDailySummary(supabase, resendApiKey, user, budgetSummaries);
      summariesSent++;

    } catch (error) {
      console.error(`Error processing user ${user.user_id}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Sent ${summariesSent} daily budget summaries`,
    summariesSent
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendDailySummary(supabase: any, resendApiKey: string, user: any, budgetSummaries: any[]) {
  // Email alert logic removed
  return;
}