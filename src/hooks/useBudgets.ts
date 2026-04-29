import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
  created_at: string;
  updated_at: string;
}

export function useBudgets() {
  // Track which budgets have sent alerts (persisted in localStorage)
  const [alertedBudgets, setAlertedBudgets] = useState<{[id: string]: boolean}>(() => {
    const stored = localStorage.getItem('budget_alerts_sent');
    return stored ? JSON.parse(stored) : {};
  });

  // Helper to send email alert
  // Email send status for UI feedback
  const [emailStatus, setEmailStatus] = useState<{success: boolean, message: string} | null>(null);

  const sendBudgetAlertEmail = (userEmail: string, budget: number, spent: number, remaining: number, name: string, category: string, percent: number) => {
    emailjs.send(
      'service_qjr2kr6',
      'template_4baxleq',
      {
        to_email: userEmail,
        from_name: 'Budget Buddy',
        from_email: 'info.helpstep@gmail.com',
        reply_to: 'info.helpstep@gmail.com',
        name,
        category,
        percent,
        budget,
        spent,
        remaining,
      },
      'hL3nMQlolokYINVc7'
    ).then(
      (result) => {
        setEmailStatus({ success: true, message: 'Budget alert email sent successfully!' });
        if (import.meta.env.DEV) console.log('Email sent:', result.text);
      },
      (error) => {
        setEmailStatus({ success: false, message: 'Failed to send budget alert email.' });
        if (import.meta.env.DEV) console.error('Email send error:', error);
      }
    );
  };
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, sessionReady } = useAuth();
  const { toast } = useToast();

  const fetchBudgets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Failed to fetch budgets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch budgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          ...budget,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setBudgets(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Budget created successfully",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create budget",
        variant: "destructive",
      });
    }
  };

  const updateBudgetSpent = async (id: string, spent: number) => {
    if (!user) {
      if (import.meta.env.DEV) console.warn('No user session — aborting updateBudgetSpent');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update({ spent })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) console.error('Supabase updateBudgetSpent error:', error);
        throw error;
      }
      if (!data) throw new Error('No row updated (session missing or RLS blocked)');

      setBudgets(prev => prev.map(b => b.id === id ? data : b));
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
    }
  };

  const updateBudget = async (id: string, updates: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) {
      if (import.meta.env.DEV) console.warn('No user session — aborting updateBudget');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) console.error('Supabase updateBudget error:', error);
        throw error;
      }
      if (!data) throw new Error('No row updated (session missing or RLS blocked)');

      setBudgets(prev => prev.map(b => b.id === id ? data : b));
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) {
      if (import.meta.env.DEV) console.warn('No user session — aborting deleteBudget');
      return;
    }
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBudgets(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Supabase deleteBudget error:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!sessionReady || !user) return;
    const run = async () => {
      try {
        await fetchBudgets();
      } catch (err) {
        if (import.meta.env.DEV) console.error('Fetch budgets failed, retrying once:', err);
        setTimeout(fetchBudgets, 500);
      }
    };
    run();
  }, [user, sessionReady]);

  // Persist alertedBudgets to localStorage
  useEffect(() => {
    localStorage.setItem('budget_alerts_sent', JSON.stringify(alertedBudgets));
  }, [alertedBudgets]);

  // Watch for budgets exceeding 80% and send alert
  useEffect(() => {
    if (!user?.email) return;
    
    budgets.forEach((budget) => {
      const percentUsed = Math.round((budget.spent / budget.allocated) * 100);
      // Only send if not already alerted and user email exists
      if (percentUsed >= 80 && !alertedBudgets[budget.id]) {
        if (import.meta.env.DEV) console.log(`Budget alert triggered for ${budget.category}`);
        sendBudgetAlertEmail(
          user.email,
          budget.allocated,
          budget.spent,
          budget.allocated - budget.spent,
          user?.user_metadata?.name || user.email,
          budget.category,
          percentUsed
        );
        setAlertedBudgets(prev => ({ ...prev, [budget.id]: true }));
      }
    });
  }, [budgets, user, alertedBudgets]);

  return {
  budgets,
  loading,
  addBudget,
  updateBudget,
  deleteBudget,
  updateBudgetSpent,
  refetch: fetchBudgets,
  emailStatus,
  };
}