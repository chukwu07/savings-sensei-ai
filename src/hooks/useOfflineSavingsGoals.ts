import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { OfflineStorageService, LocalSavingsGoal } from '@/services/offlineStorage';
import { SyncService } from '@/services/syncService';
import { SavingsGoal } from '@/hooks/useSavingsGoals';

export function useOfflineSavingsGoals() {
  const [goals, setGoals] = useState<LocalSavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { toast } = useToast();

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const localGoals = await OfflineStorageService.getSavingsGoals(user.id);
      setGoals(localGoals);
    } catch (error: any) {
      console.error('Failed to fetch savings goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    if (!user || !isOnline || syncing) return;

    try {
      setSyncing(true);
      await SyncService.performFullSync(user.id);
      await fetchGoals();
    } catch (error) {
      console.error('Savings goals sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const addGoal = async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const newGoal = {
        ...goal,
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await OfflineStorageService.addSavingsGoal(newGoal);
      await fetchGoals();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to add savings goal:', error);
    }
  };

  const updateGoal = async (id: string, updates: Partial<LocalSavingsGoal>) => {
    if (!user) return;

    try {
      const result = await OfflineStorageService.updateSavingsGoal(id, updates);
      await fetchGoals();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to update savings goal:', error);
    }
  };

  const updateGoalProgress = async (id: string, current_amount: number) => {
    return updateGoal(id, { current_amount });
  };

  const deleteGoal = async (id: string) => {
    try {
      await OfflineStorageService.deleteSavingsGoal(id);
      await fetchGoals();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
    } catch (error: any) {
      console.error('Failed to delete savings goal:', error);
    }
  };

  useEffect(() => {
    if (isOnline && user) {
      syncData();
    }
  }, [isOnline, user]);

  useEffect(() => {
    fetchGoals();
  }, [user]);

  return {
    goals,
    loading,
    syncing,
    addGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
    refetch: fetchGoals,
    syncData,
  };
}