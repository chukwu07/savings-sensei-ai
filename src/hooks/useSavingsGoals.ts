import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('deadline');

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch savings goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .insert([{
          ...goal,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Savings goal created successfully",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create savings goal",
        variant: "destructive",
      });
    }
  };

  const updateGoalProgress = async (id: string, current_amount: number) => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .update({ current_amount })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => prev.map(g => g.id === id ? data : g));
      toast({
        title: "Success",
        description: "Goal progress updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
    }
  };

  const updateGoal = async (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => prev.map(g => g.id === id ? data : g));
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setGoals(prev => prev.filter(g => g.id !== id));
      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
    refetch: fetchGoals,
  };
}