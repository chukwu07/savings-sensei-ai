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
  // Track which budgets have sent alerts (in-memory, resets on reload)
  const [alertedBudgets, setAlertedBudgets] = useState<{[id: string]: boolean}>({});

  // Helper to send email alert
  // Email send status for UI feedback
  const [emailStatus, setEmailStatus] = useState<{success: boolean, message: string} | null>(null);

  const sendBudgetAlertEmail = (userEmail: string, budget: number, spent: number, remaining: number, name: string, category: string, percent: number) => {
    emailjs.send(
      'service_iuoqkk8',
      'template_diuwmud',
      {
        email: userEmail,
        from_name: 'Savings Sensei',
        from_email: 'noreply@savingssensei.com',
        reply_to: '420bilall@gmail.com',
        name,
        category,
        percent,
        budget,
        spent,
        remaining,
      },
      'oEFATUkrPGUAdS4Ut'
    ).then(
      (result) => {
        setEmailStatus({ success: true, message: 'Budget alert email sent successfully!' });
        console.log('Email sent:', result.text);
      },
      (error) => {
        setEmailStatus({ success: false, message: 'Failed to send budget alert email.' });
        console.error('Email send error:', error);
      }
    );
  };
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('category');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error: any) {
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
      
      setBudgets(prev => [...prev, data]);
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
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update({ spent })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
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
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
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
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBudgets(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  // Watch for budgets exceeding 80% and send alert
  useEffect(() => {
    budgets.forEach((budget) => {
      const percentUsed = Math.round((budget.spent / budget.allocated) * 100);
      // Only send if not already alerted and user email exists
      if (percentUsed >= 80 && !alertedBudgets[budget.id] && user?.email) {
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
  }, [user]);

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