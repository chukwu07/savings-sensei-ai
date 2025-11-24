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

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Error checking admin role:', roleError);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      EdgeSecurityLogger.logSuspiciousActivity(req, 'get-admin-analytics', 'Non-admin attempted to access analytics', { userId: user.id });
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch aggregate analytics
    const [
      { count: totalUsers },
      { count: activeSubscribers },
      { count: totalTransactions },
      { data: subscribers },
      { data: transactions },
    ] = await Promise.all([
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseClient.from('subscribers').select('*', { count: 'exact', head: true }).eq('subscribed', true),
      supabaseClient.from('transactions').select('*', { count: 'exact', head: true }),
      supabaseClient.from('subscribers').select('subscription_tier, created_at'),
      supabaseClient.from('transactions').select('category, created_at, amount, type'),
    ]);

    // Calculate metrics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newUsersThisMonth = (subscribers || []).filter(
      (s: any) => new Date(s.created_at) >= thisMonth
    ).length;

    const transactionsThisMonth = (transactions || []).filter(
      (t: any) => new Date(t.created_at) >= thisMonth
    ).length;

    const subscriptionRate = totalUsers ? ((activeSubscribers || 0) / totalUsers * 100).toFixed(1) : '0';

    // Calculate MRR
    const tierPrices: Record<string, number> = {
      'Basic': 6.99,
      'Premium': 9.99,
      'Pro': 14.99,
    };

    const monthlyRevenue = (subscribers || [])
      .filter((s: any) => s.subscription_tier)
      .reduce((sum: number, s: any) => sum + (tierPrices[s.subscription_tier] || 0), 0)
      .toFixed(2);

    // User growth (last 30 days)
    const userGrowth = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(last30Days.getTime() + i * 24 * 60 * 60 * 1000);
      const count = (subscribers || []).filter(
        (s: any) => new Date(s.created_at) <= date
      ).length;
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: count,
      };
    });

    // Transaction volume by category
    const categoryMap: Record<string, number> = {};
    (transactions || []).forEach((t: any) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
    });

    const transactionVolume = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));

    // Category distribution (pie chart data)
    const categoryDistribution = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Subscription tiers
    const tierMap: Record<string, number> = {};
    (subscribers || []).forEach((s: any) => {
      if (s.subscription_tier) {
        tierMap[s.subscription_tier] = (tierMap[s.subscription_tier] || 0) + 1;
      }
    });

    const subscriptionTiers = Object.entries(tierMap).map(([tier, count]) => ({
      tier,
      count,
    }));

    EdgeSecurityLogger.logEvent(req, {
      event: 'ADMIN_ANALYTICS_ACCESSED',
      details: { adminUserId: user.id },
    });

    return new Response(
      JSON.stringify({
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        totalTransactions: totalTransactions || 0,
        newUsersThisMonth,
        transactionsThisMonth,
        subscriptionRate,
        monthlyRevenue,
        userGrowth,
        transactionVolume,
        categoryDistribution,
        subscriptionTiers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-admin-analytics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
