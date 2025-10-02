import { supabase } from '@/integrations/supabase/client';
import { OfflineStorageService } from './offlineStorage';
import { useToast } from '@/hooks/use-toast';

export class SyncService {
  private static isRunning = false;

  static async performFullSync(userId: string, toast?: any) {
    if (this.isRunning) {
      console.log('Sync already in progress');
      return;
    }

    this.isRunning = true;
    
    try {
      // Sync from server to local first (pull)
      await this.pullFromServer(userId);
      
      // Then sync local changes to server (push)
      await this.pushToServer(userId);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private static async pullFromServer(userId: string) {
    try {
      // Pull transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactions) {
        // Get list of locally deleted items
        const deletedQueue = await OfflineStorageService.getSyncQueue();
        const deletedIds = deletedQueue
          .filter(item => item.table === 'transactions' && item.operation === 'DELETE')
          .map(item => item.data.id);

        for (const transaction of transactions) {
          // Skip if this item was deleted locally
          if (deletedIds.includes(transaction.id)) {
            continue;
          }
          
          const existing = await OfflineStorageService.offlineDB.transactions.get(transaction.id);
          if (!existing || existing.updated_at < transaction.updated_at) {
            await OfflineStorageService.offlineDB.transactions.put({
              ...transaction,
              type: transaction.type as 'income' | 'expense',
              synced: true,
              pending_sync: false
            });
          }
        }
        await OfflineStorageService.updateSyncMetadata('transactions');
      }

      // Pull budgets
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*');

      if (budgets) {
        // Get list of locally deleted items
        const deletedQueue = await OfflineStorageService.getSyncQueue();
        const deletedIds = deletedQueue
          .filter(item => item.table === 'budgets' && item.operation === 'DELETE')
          .map(item => item.data.id);

        for (const budget of budgets) {
          // Skip if this item was deleted locally
          if (deletedIds.includes(budget.id)) {
            continue;
          }
          
          const existing = await OfflineStorageService.offlineDB.budgets.get(budget.id);
          if (!existing || existing.updated_at < budget.updated_at) {
            await OfflineStorageService.offlineDB.budgets.put({
              ...budget,
              synced: true,
              pending_sync: false
            });
          }
        }
        await OfflineStorageService.updateSyncMetadata('budgets');
      }

      // Pull savings goals
      const { data: savingsGoals } = await supabase
        .from('savings_goals')
        .select('*');

      if (savingsGoals) {
        // Get list of locally deleted items
        const deletedQueue = await OfflineStorageService.getSyncQueue();
        const deletedIds = deletedQueue
          .filter(item => item.table === 'savings_goals' && item.operation === 'DELETE')
          .map(item => item.data.id);

        for (const goal of savingsGoals) {
          // Skip if this item was deleted locally
          if (deletedIds.includes(goal.id)) {
            continue;
          }
          
          const existing = await OfflineStorageService.offlineDB.savings_goals.get(goal.id);
          if (!existing || existing.updated_at < goal.updated_at) {
            await OfflineStorageService.offlineDB.savings_goals.put({
              ...goal,
              synced: true,
              pending_sync: false
            });
          }
        }
        await OfflineStorageService.updateSyncMetadata('savings_goals');
      }
    } catch (error) {
      console.error('Pull sync failed:', error);
      throw error;
    }
  }

  private static async pushToServer(userId: string) {
    const syncQueue = await OfflineStorageService.getSyncQueue();
    
    for (const queueItem of syncQueue) {
      try {
        switch (queueItem.operation) {
          case 'INSERT':
            await this.handleInsert(queueItem);
            break;
          case 'UPDATE':
            await this.handleUpdate(queueItem);
            break;
          case 'DELETE':
            await this.handleDelete(queueItem);
            break;
        }
        
        // Remove from sync queue on success
        if (queueItem.id) {
          await OfflineStorageService.removeSyncQueueItem(queueItem.id);
        }
      } catch (error) {
        console.error(`Failed to sync ${queueItem.operation} on ${queueItem.table}:`, error);
        // Keep in queue for retry
      }
    }
  }

  private static async handleInsert(queueItem: any) {
    const { table, data } = queueItem;
    const { synced, pending_sync, ...cleanData } = data;

    const { data: result, error } = await supabase
      .from(table)
      .insert([cleanData])
      .select()
      .single();

    if (error) throw error;

    // Update local record as synced
    const tableName = table as 'transactions' | 'budgets' | 'savings_goals';
    await OfflineStorageService.offlineDB[tableName].update(data.id, {
      synced: true,
      pending_sync: false
    } as any);
  }

  private static async handleUpdate(queueItem: any) {
    const { table, data } = queueItem;
    const { id, synced, pending_sync, ...updateData } = data;

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Update local record as synced
    const tableName = table as 'transactions' | 'budgets' | 'savings_goals';
    await OfflineStorageService.offlineDB[tableName].update(id, {
      synced: true,
      pending_sync: false
    } as any);
  }

  private static async handleDelete(queueItem: any) {
    const { table, data } = queueItem;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', data.id);

    if (error && error.code !== 'PGRST116') { // Not found is OK for delete
      throw error;
    }
  }

  static async getPendingSyncCount(): Promise<number> {
    const queue = await OfflineStorageService.getSyncQueue();
    return queue.length;
  }
}
