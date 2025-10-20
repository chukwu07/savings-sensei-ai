import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from request
    const authHeader = req.headers.get("authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Fetch user's financial data
    const [transactionsRes, budgetsRes, goalsRes] = await Promise.all([
      supabaseClient.from("transactions").select("*").order("date", { ascending: false }).limit(50),
      supabaseClient.from("budgets").select("*"),
      supabaseClient.from("savings_goals").select("*")
    ]);

    const transactions = transactionsRes.data || [];
    const budgets = budgetsRes.data || [];
    const goals = goalsRes.data || [];

    // Calculate spending by category
    const spendingByCategory: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
      }
    });

    // Calculate total income and expenses
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Build context message
    const contextMessage = `You are a helpful financial advisor AI for BudgetBuddy app. Here is the user's current financial data:

BUDGETS:
${budgets.length > 0 ? budgets.map(b => `- ${b.category}: $${b.spent.toFixed(2)} spent of $${b.allocated.toFixed(2)} allocated (${Math.round((b.spent / b.allocated) * 100)}%)`).join('\n') : 'No budgets set up yet.'}

SPENDING BY CATEGORY:
${Object.entries(spendingByCategory).length > 0 ? Object.entries(spendingByCategory)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
  .join('\n') : 'No transactions recorded yet.'}

SAVINGS GOALS:
${goals.length > 0 ? goals.map(g => `- ${g.name}: $${g.current_amount.toFixed(2)} of $${g.target_amount.toFixed(2)} (${Math.round((g.current_amount / g.target_amount) * 100)}%)`).join('\n') : 'No savings goals set up yet.'}

SUMMARY:
- Total income: $${totalIncome.toFixed(2)}
- Total expenses: $${totalExpenses.toFixed(2)}
- Net: $${(totalIncome - totalExpenses).toFixed(2)}
- Number of transactions: ${transactions.length}

Based on this data, provide helpful, personalized financial advice. Be conversational and friendly. Reference specific numbers and categories from their data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: contextMessage },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Internal] AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Unable to process your request. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        content: data.choices[0].message.content 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Internal] AI chat error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process your request. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
