import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Wifi, WifiOff } from "lucide-react";
import { useOfflineTransactions } from "@/hooks/useOfflineTransactions";
import { useOfflineBudgets } from "@/hooks/useOfflineBudgets";
import { useNetwork } from "@/contexts/NetworkContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedTransactionInsights } from "@/hooks/useEnhancedTransactionInsights";
import { TransactionViewToggle, ViewMode } from "./transactions/TransactionViewToggle";
import { TransactionPlainView } from "./transactions/TransactionPlainView";
import { TransactionDateGroupedView } from "./transactions/TransactionDateGroupedView";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
  'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
  'Income', 'Investment', 'Other'
];

export function OfflineTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('plain');
  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    category: "",
    type: "expense" as "income" | "expense"
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { transactions, loading, syncing, addTransaction, updateTransaction, deleteTransaction } = useOfflineTransactions();
  const { budgets, updateBudgetSpent } = useOfflineBudgets();
  
  // Convert offline transactions to regular format for insights
  const regularTransactions = transactions.map(t => ({
    id: t.id,
    user_id: t.user_id,
    description: t.description,
    amount: t.amount,
    category: t.category,
    type: t.type,
    date: t.date,
    created_at: t.created_at,
    updated_at: t.updated_at
  }));

  const { getBudgetImpactInsight, getCategoryRecommendation } = useEnhancedTransactionInsights(regularTransactions, budgets);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await addTransaction({
        description: newTransaction.description,
        amount: amount,
        category: newTransaction.category,
        type: newTransaction.type,
        date: new Date().toISOString().split('T')[0],
      });

      // Update budget if it's an expense
      if (newTransaction.type === 'expense') {
        const categoryBudget = budgets.find(b => b.category === newTransaction.category);
        if (categoryBudget) {
          await updateBudgetSpent(categoryBudget.id, categoryBudget.spent + amount);
        }
      }

      // Reset form
      setNewTransaction({
        description: "",
        amount: "",
        category: "",
        type: "expense"
      });

      toast({
        title: "Success",
        description: isOnline 
          ? "Transaction added and synced successfully" 
          : "Transaction saved offline - will sync when back online",
      });
    } catch (error) {
      console.error('Add transaction error:', error);
    }
  };

  const getAIInsight = (description: string, amount: string) => {
    if (!description || !amount) return null;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return null;

    const categoryRecommendation = getCategoryRecommendation(description);
    
    // Create a mock transaction object for budget impact analysis
    const mockTransaction = {
      id: 'temp',
      user_id: user?.id || '',
      description,
      amount: numAmount,
      category: categoryRecommendation.category,
      type: newTransaction.type,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const budgetImpact = getBudgetImpactInsight(mockTransaction);

    return {
      categoryRecommendation,
      budgetImpact
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <EnhancedCard key={i} variant="floating" className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </EnhancedCard>
        ))}
      </div>
    );
  }

  const aiInsight = getAIInsight(newTransaction.description, newTransaction.amount);

  return (
    <div className="space-y-6">
      {/* Network Status Indicator */}
      {(!isOnline || syncing) && (
        <EnhancedCard variant="floating" className="p-4 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            {syncing ? (
              <>
                <Wifi className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Syncing data...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Offline mode - data will sync when connection returns</span>
              </>
            )}
          </div>
        </EnhancedCard>
      )}

      {/* Add Transaction Form */}
      <EnhancedCard variant="floating" className="p-6">
        <h2 className="text-xl font-semibold mb-4 gradient-text">Add Transaction</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was this transaction for?"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={(value) => setNewTransaction({...newTransaction, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="type">Type</Label>
            <Select onValueChange={(value) => setNewTransaction({...newTransaction, type: value as "income" | "expense"})}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button onClick={handleAddTransaction} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>

        {/* AI Insights */}
        {aiInsight && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="text-sm font-medium mb-2 text-primary">💡 Smart Insights</h3>
            <div className="space-y-2">
              {aiInsight.categoryRecommendation && (
                <p className="text-sm">
                  <strong>Suggested Category:</strong> {aiInsight.categoryRecommendation.category}
                </p>
              )}
              {aiInsight.budgetImpact && (
                <p className="text-sm text-orange-600">
                  <strong>Budget Impact:</strong> {aiInsight.budgetImpact}
                </p>
              )}
            </div>
          </div>
        )}
      </EnhancedCard>

      {/* Transaction List Controls */}
      <EnhancedCard variant="floating" className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TransactionViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </EnhancedCard>

      {/* Transaction List */}
      {viewMode === 'plain' ? (
        <TransactionPlainView
          transactions={filteredTransactions.map(t => ({
            id: t.id,
            user_id: t.user_id,
            description: t.description,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date,
            created_at: t.created_at,
            updated_at: t.updated_at
          }))}
          onDeleteTransaction={deleteTransaction}
        />
      ) : (
        <TransactionDateGroupedView
          transactions={filteredTransactions.map(t => ({
            id: t.id,
            user_id: t.user_id,
            description: t.description,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: t.date,
            created_at: t.created_at,
            updated_at: t.updated_at
          }))}
          onDeleteTransaction={deleteTransaction}
        />
      )}

      {filteredTransactions.length === 0 && (
        <EnhancedCard 
          variant="floating" 
          layout="vertical"
          title="No transactions found"
          description="Add your first transaction above!"
          className="py-6"
        />
      )}
    </div>
  );
}