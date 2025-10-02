import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { OfflineStorageService, LocalBudget } from '@/services/offlineStorage';
import { SyncService } from '@/services/syncService';
import { Budget } from '@/hooks/useBudgets';

export function useOfflineBudgets() {
  const [budgets, setBudgets] = useState<LocalBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { toast } = useToast();

  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const localBudgets = await OfflineStorageService.getBudgets(user.id);
      setBudgets(localBudgets);
    } catch (error: any) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    if (!user || !isOnline || syncing) return;

    try {
      setSyncing(true);
      await SyncService.performFullSync(user.id);
      await fetchBudgets();
    } catch (error) {
      console.error('Budget sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const addBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const newBudget = {
        ...budget,
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _alertSent: false,
      };

      const result = await OfflineStorageService.addBudget(newBudget);
      await fetchBudgets();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to add budget:', error);
    }
  };

  const updateBudget = async (id: string, updates: Partial<LocalBudget>) => {
    if (!user) return;

    try {
      const result = await OfflineStorageService.updateBudget(id, updates);
      await fetchBudgets();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to update budget:', error);
    }
  };

  const updateBudgetSpent = async (id: string, spent: number) => {
    return updateBudget(id, { spent });
  };

  const deleteBudget = async (id: string) => {
    try {
      await OfflineStorageService.deleteBudget(id);
      await fetchBudgets();

      if (isOnline) {
        setTimeout(() => syncData(), 100);
      }
    } catch (error: any) {
      console.error('Failed to delete budget:', error);
    }
  };

  useEffect(() => {
    if (isOnline && user) {
      syncData();
    }
  }, [isOnline, user]);

  useEffect(() => {
    fetchBudgets();
  }, [user]);

  return {
    budgets,
    loading,
    syncing,
    addBudget,
    updateBudget,
    updateBudgetSpent,
    deleteBudget,
    refetch: fetchBudgets,
    syncData,
  };
}