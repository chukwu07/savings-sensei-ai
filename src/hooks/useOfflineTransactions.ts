import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { OfflineStorageService, LocalTransaction } from '@/services/offlineStorage';
import { SyncService } from '@/services/syncService';
import { Transaction } from '@/hooks/useTransactions';

export function useOfflineTransactions() {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { toast } = useToast();

  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const localTransactions = await OfflineStorageService.getTransactions(user.id);
      setTransactions(localTransactions);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    if (!user || !isOnline || syncing) return;

    try {
      setSyncing(true);
      await SyncService.performFullSync(user.id);
      await fetchTransactions(); // Refresh local data
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const newTransaction = {
        ...transaction,
        id: crypto.randomUUID(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await OfflineStorageService.addTransaction(newTransaction);
      await fetchTransactions();

      if (isOnline) {
        // Try immediate sync if online
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to add transaction:', error);
    }
  };

  const updateTransaction = async (id: string, updates: Partial<LocalTransaction>) => {
    if (!user) return;

    try {
      const result = await OfflineStorageService.updateTransaction(id, updates);
      await fetchTransactions();

      if (isOnline) {
        // Try immediate sync if online
        setTimeout(() => syncData(), 100);
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to update transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await OfflineStorageService.deleteTransaction(id);
      await fetchTransactions();

      if (isOnline) {
        // Try immediate sync if online
        setTimeout(() => syncData(), 100);
      }
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      syncData();
    }
  }, [isOnline, user]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [user]);

  return {
    transactions,
    loading,
    syncing,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
    syncData,
  };
}