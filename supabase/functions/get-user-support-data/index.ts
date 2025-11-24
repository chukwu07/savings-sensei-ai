import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { EdgeSecurityLogger } from '../_shared/securityUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!isAdmin) {
      EdgeSecurityLogger.logSuspiciousActivity(req, 'get-user-support-data', 'Non-admin attempted to access user data', { userId: user.id });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Target user ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user support data
    const [
      { data: profile },
      { data: transactions },
      { data: budgets },
      { data: goals },
      { data: subscription },
    ] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id', targetUserId).single(),
      supabaseClient.from('transactions').select('*').eq('user_id', targetUserId).order('date', { ascending: false }).limit(50),
      supabaseClient.from('budgets').select('*').eq('user_id', targetUserId),
      supabaseClient.from('savings_goals').select('*').eq('user_id', targetUserId),
      supabaseClient.from('subscribers').select('*').eq('user_id', targetUserId).single(),
    ]);

    // Log audit event
    await supabaseClient.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      action: 'VIEW_USER_SUPPORT_DATA',
      target_user_id: targetUserId,
      details: { timestamp: new Date().toISOString() },
    });

    EdgeSecurityLogger.logEvent(req, {
      event: 'ADMIN_USER_DATA_ACCESSED',
      details: { adminUserId: user.id, targetUserId },
    });

    return new Response(
      JSON.stringify({
        profile,
        transactions,
        budgets,
        goals,
        subscription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-user-support-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
