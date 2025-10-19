import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const calculateNextDueDate = (frequency: string, currentDate: Date): Date => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request using CRON_SECRET
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized access attempt to process-recurring-transactions');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing recurring transactions...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Use service role key to access all user data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active recurring transactions that are due today or overdue
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today.toISOString().split('T')[0]);

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const recurringTx of recurringTransactions || []) {
      try {
        // Check if end_date is set and we've passed it
        if (recurringTx.end_date) {
          const endDate = new Date(recurringTx.end_date);
          if (today > endDate) {
            // Deactivate the recurring transaction
            await supabase
              .from('recurring_transactions')
              .update({ is_active: false })
              .eq('id', recurringTx.id);
            
            console.log(`Deactivated expired recurring transaction: ${recurringTx.description}`);
            continue;
          }
        }

        // Create the actual transaction
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: recurringTx.user_id,
            description: recurringTx.description,
            amount: recurringTx.amount,
            category: recurringTx.category,
            type: recurringTx.type,
            date: today.toISOString().split('T')[0]
          });

        if (insertError) {
          console.error(`Error creating transaction for ${recurringTx.description}:`, insertError);
          errorCount++;
          continue;
        }

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(recurringTx.frequency, new Date(recurringTx.next_due_date));

        // Update the recurring transaction with the next due date
        const { error: updateError } = await supabase
          .from('recurring_transactions')
          .update({ next_due_date: nextDueDate.toISOString().split('T')[0] })
          .eq('id', recurringTx.id);

        if (updateError) {
          console.error(`Error updating recurring transaction ${recurringTx.description}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`Processed recurring transaction: ${recurringTx.description} - Next due: ${nextDueDate.toDateString()}`);
        processedCount++;

      } catch (error) {
        console.error(`Error processing recurring transaction ${recurringTx.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Recurring transactions processing completed: ${processedCount} processed, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} recurring transactions`,
      processed: processedCount,
      errors: errorCount,
      total: recurringTransactions?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-recurring-transactions function:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process recurring transactions',
      details: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});