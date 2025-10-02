import Dexie, { Table } from 'dexie';

// Local database interfaces
export interface LocalTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  pending_sync?: boolean;
}

export interface LocalBudget {
  _alertSent: any;
  id: string;
  user_id: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  pending_sync?: boolean;
}

export interface LocalSavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  pending_sync?: boolean;
}

export interface SyncQueue {
  id?: number;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: string;
}

export interface SyncMetadata {
  table: string;
  last_sync: string;
}

// Local database class
class OfflineDatabase extends Dexie {
  transactions!: Table<LocalTransaction>;
  budgets!: Table<LocalBudget>;
  savings_goals!: Table<LocalSavingsGoal>;
  sync_queue!: Table<SyncQueue>;
  sync_metadata!: Table<SyncMetadata>;

  constructor() {
    super('BudgetBuddyOffline');
    
    this.version(1).stores({
      transactions: 'id, user_id, date, category, type, synced',
      budgets: 'id, user_id, category, synced',
      savings_goals: 'id, user_id, synced',
      sync_queue: '++id, table, operation, timestamp',
      sync_metadata: 'table, last_sync'
    });
  }
}

export const offlineDB = new OfflineDatabase();

// Offline storage service
export class OfflineStorageService {
  static get offlineDB() {
    return offlineDB;
  }
  static async addToSyncQueue(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    await offlineDB.sync_queue.add({
      table,
      operation,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static async getSyncQueue() {
    return await offlineDB.sync_queue.orderBy('timestamp').toArray();
  }

  static async clearSyncQueue() {
    await offlineDB.sync_queue.clear();
  }

  static async removeSyncQueueItem(id: number) {
    await offlineDB.sync_queue.delete(id);
  }

  static async updateSyncMetadata(table: string) {
    await offlineDB.sync_metadata.put({
      table,
      last_sync: new Date().toISOString()
    });
  }

  static async getSyncMetadata(table: string) {
    return await offlineDB.sync_metadata.get(table);
  }

  // Transaction operations
  static async getTransactions(userId: string): Promise<LocalTransaction[]> {
    return await offlineDB.transactions
      .where('user_id')
      .equals(userId)
      .reverse()
      .sortBy('date');
  }

  static async addTransaction(transaction: Omit<LocalTransaction, 'synced' | 'pending_sync'>) {
    const localTransaction = { 
      ...transaction, 
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.transactions.add(localTransaction);
    await this.addToSyncQueue('transactions', 'INSERT', localTransaction);
    return localTransaction;
  }

  static async updateTransaction(id: string, updates: Partial<LocalTransaction>) {
    const updatedTransaction = { 
      ...updates, 
      updated_at: new Date().toISOString(),
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.transactions.update(id, updatedTransaction);
    await this.addToSyncQueue('transactions', 'UPDATE', { id, ...updatedTransaction });
    return updatedTransaction;
  }

  static async deleteTransaction(id: string) {
    await offlineDB.transactions.delete(id);
    await this.addToSyncQueue('transactions', 'DELETE', { id });
  }

  // Budget operations
  static async getBudgets(userId: string): Promise<LocalBudget[]> {
    return await offlineDB.budgets
      .where('user_id')
      .equals(userId)
      .toArray();
  }

  static async addBudget(budget: Omit<LocalBudget, 'synced' | 'pending_sync'>) {
    const localBudget = { 
      ...budget, 
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.budgets.add(localBudget);
    await this.addToSyncQueue('budgets', 'INSERT', localBudget);
    return localBudget;
  }

  static async updateBudget(id: string, updates: Partial<LocalBudget>) {
    const updatedBudget = { 
      ...updates, 
      updated_at: new Date().toISOString(),
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.budgets.update(id, updatedBudget);
    await this.addToSyncQueue('budgets', 'UPDATE', { id, ...updatedBudget });
    return updatedBudget;
  }

  static async deleteBudget(id: string) {
    await offlineDB.budgets.delete(id);
    await this.addToSyncQueue('budgets', 'DELETE', { id });
  }

  // Savings goals operations
  static async getSavingsGoals(userId: string): Promise<LocalSavingsGoal[]> {
    return await offlineDB.savings_goals
      .where('user_id')
      .equals(userId)
      .toArray();
  }

  static async addSavingsGoal(goal: Omit<LocalSavingsGoal, 'synced' | 'pending_sync'>) {
    const localGoal = { 
      ...goal, 
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.savings_goals.add(localGoal);
    await this.addToSyncQueue('savings_goals', 'INSERT', localGoal);
    return localGoal;
  }

  static async updateSavingsGoal(id: string, updates: Partial<LocalSavingsGoal>) {
    const updatedGoal = { 
      ...updates, 
      updated_at: new Date().toISOString(),
      synced: false, 
      pending_sync: true 
    };
    
    await offlineDB.savings_goals.update(id, updatedGoal);
    await this.addToSyncQueue('savings_goals', 'UPDATE', { id, ...updatedGoal });
    return updatedGoal;
  }

  static async deleteSavingsGoal(id: string) {
    await offlineDB.savings_goals.delete(id);
    await this.addToSyncQueue('savings_goals', 'DELETE', { id });
  }
}