import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { rateLimiter, createRateLimitResponse } from '../_shared/rateLimiter.ts';
import { EdgeSecurityLogger, validateInput, createSecureErrorResponse } from '../_shared/securityUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - max 10 requests per minute per user
  const rateLimit = await rateLimiter.checkLimit(req, {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => {
      const authHeader = req.headers.get('Authorization');
      return authHeader ? `ai-advisor:${authHeader.substring(0, 50)}` : 'anonymous';
    }
  });

  if (!rateLimit.allowed) {
    EdgeSecurityLogger.logSuspiciousActivity(req, 'ai-financial-advisor', 'Rate limit exceeded');
    return createRateLimitResponse(rateLimit.resetTime);
  }

  try {
    const requestData = await req.json();
    const { message } = requestData;

    // Validate input
    const validation = validateInput(requestData, ['message']);
    if (!validation.valid) {
      EdgeSecurityLogger.logSuspiciousActivity(req, 'ai-financial-advisor', 'Invalid input', { errors: validation.errors });
      return createSecureErrorResponse('Invalid request data', 400);
    }

    // Preprocess user input for better AI understanding
    const processedMessage = preprocessUserInput(message);
    console.log('Processed message:', processedMessage.substring(0, 100) + '...');

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      EdgeSecurityLogger.logAuthAttempt(req, 'ai-financial-advisor', false, undefined, { reason: 'No auth header' });
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get user's financial data
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      EdgeSecurityLogger.logAuthAttempt(req, 'ai-financial-advisor', false, undefined, { reason: 'Invalid token' });
      throw new Error('User not authenticated');
    }

    EdgeSecurityLogger.logAuthAttempt(req, 'ai-financial-advisor', true, user.id);

    // Get conversation history for multi-turn context
    const conversationHistory = await getConversationHistory(supabaseClient, user.id);

    // Fetch user's financial data with expanded timeframe
    const [transactionsRes, budgetsRes, goalsRes] = await Promise.all([
      supabaseClient.from('transactions').select('*').order('date', { ascending: false }).limit(50), // Increased for better context
      supabaseClient.from('budgets').select('*'),
      supabaseClient.from('savings_goals').select('*')
    ]);

    const transactions = transactionsRes.data || [];
    const budgets = budgetsRes.data || [];
    const goals = goalsRes.data || [];

    // Enhanced financial context with insights
    const financialContext = buildEnhancedFinancialContext(transactions, budgets, goals);

    // Store user message in conversation history
    await storeMessage(supabaseClient, user.id, 'user', processedMessage);

    // Generate AI response with improved context
    const aiResponse = await generateAIResponse(processedMessage, conversationHistory, financialContext);

    // Store AI response in conversation history
    await storeMessage(supabaseClient, user.id, 'assistant', aiResponse);

    // Log successful AI interaction
    EdgeSecurityLogger.logEvent(req, {
      userId: user.id,
      event: 'ai.interaction',
      functionName: 'ai-financial-advisor',
      details: { messageLength: message.length, responseLength: aiResponse.length }
    });

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in AI financial advisor:', error);
    
    // Safe fallback message that's still helpful
    const fallbackMessage = "Sorry, I couldn't process that request right now. Please try asking about your budget, spending patterns, or financial goals, and I'll do my best to help you!";
    
    // Return structured response with fallback
    return new Response(JSON.stringify({
      response: fallbackMessage,
      success: false,
      error: 'AI service temporarily unavailable'
    }), {
      status: 200, // Return 200 to avoid breaking the UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function preprocessUserInput(message: string): string {
  // Normalize and clean the message
  let processed = message.trim();
  
  // Basic spelling corrections for common financial terms
  const corrections: Record<string, string> = {
    'spendng': 'spending',
    'budjet': 'budget',
    'mony': 'money',
    'expens': 'expense',
    'expences': 'expenses',
    'expence': 'expense',
    'savngs': 'savings',
    'finanical': 'financial',
    'finacial': 'financial',
    'recmend': 'recommend',
    'sugest': 'suggest',
    'categry': 'category',
    'categries': 'categories'
  };

  Object.keys(corrections).forEach(mistake => {
    const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
    processed = processed.replace(regex, corrections[mistake]);
  });

  return processed;
}

async function getConversationHistory(supabaseClient: any, userId: string): Promise<Message[]> {
  try {
    const { data: history, error } = await supabaseClient
      .from('conversation_history')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(8); // Limit for token efficiency

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return history || [];
  } catch (error) {
    console.error('Error in getConversationHistory:', error);
    return [];
  }
}

async function storeMessage(supabaseClient: any, userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('conversation_history')
      .insert({
        user_id: userId,
        role,
        content
      });

    if (error) {
      console.error('Error storing message:', error);
    }
  } catch (error) {
    console.error('Error in storeMessage:', error);
  }
}

function buildEnhancedFinancialContext(transactions: any[], budgets: any[], goals: any[]) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  // Calculate spending by category
  const spendingByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + Number(t.amount);
  });

  // Enhanced budget analysis
  const budgetAnalysis = budgets.map(b => {
    const categorySpending = spendingByCategory[b.category] || 0;
    const percentUsed = (categorySpending / b.allocated) * 100;
    return {
      category: b.category,
      allocated: b.allocated,
      spent: categorySpending,
      remaining: b.allocated - categorySpending,
      percentUsed: percentUsed.toFixed(1),
      status: percentUsed >= 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'good'
    };
  });

  return {
    summary: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      transactionCount: transactions.length
    },
    budgets: budgetAnalysis,
    goals: goals.map(g => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      progress: ((g.current_amount / g.target_amount) * 100).toFixed(1),
      deadline: g.deadline,
      daysUntilDeadline: Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    })),
    recentTransactions: transactions.slice(0, 5).map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
      type: t.type
    })),
    spendingByCategory
  };
}

async function generateAIResponse(message: string, conversationHistory: Message[], financialContext: any): Promise<string> {
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build structured prompt with conversation context
    const messages = [
      {
        role: 'system',
        content: buildSystemPrompt(financialContext)
      },
      ...conversationHistory.slice(-6), // Include last 6 messages for context
      {
        role: 'user',
        content: message
      }
    ];

    console.log(`Calling OpenAI API with ${messages.length} messages`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07', // Cost-efficient model for financial advice
        messages: messages,
        max_completion_tokens: 400, // Optimized token usage
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response structure:', data);
      throw new Error('Invalid response from AI service');
    }

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

function buildSystemPrompt(financialContext: any): string {
  return `You are BudgetBuddy AI, an expert financial advisor specializing in personal budgeting, expense tracking, and financial goal achievement.

CURRENT FINANCIAL OVERVIEW:
• Income: $${financialContext.summary.totalIncome.toFixed(2)}
• Expenses: $${financialContext.summary.totalExpenses.toFixed(2)}  
• Net Cash Flow: $${financialContext.summary.netCashFlow.toFixed(2)}
• Recent Transactions: ${financialContext.summary.transactionCount}

BUDGET STATUS:
${financialContext.budgets.map((b: any) => 
  `• ${b.category}: $${b.spent} of $${b.allocated} (${b.percentUsed}%) - ${b.status}`
).join('\n')}

SAVINGS GOALS:
${financialContext.goals.map((g: any) => 
  `• ${g.name}: $${g.current} of $${g.target} (${g.progress}%) - ${g.daysUntilDeadline} days left`
).join('\n')}

GUIDELINES:
- Provide actionable, personalized advice based on their actual financial data
- Reference specific amounts, categories, and percentages when relevant
- Be encouraging yet realistic about their financial situation
- Suggest concrete steps for improvement
- Keep responses concise but comprehensive (150-300 words)
- Maintain conversation context from previous messages
- Focus on practical budgeting and spending optimization

Remember: You're their knowledgeable financial friend who understands their specific situation.`;
}