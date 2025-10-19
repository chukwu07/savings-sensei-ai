import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
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
import { transactionSchema, formatZodError } from "@/lib/validation-schemas";

const categories = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
  'Healthcare', 'Education', 'Travel', 'Personal Care', 'Home & Garden',
  'Income', 'Investment', 'Other'
];

export function Transactions() {
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
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { budgets, updateBudgetSpent } = useBudgets();
  const { getBudgetImpactInsight, getCategoryRecommendation } = useEnhancedTransactionInsights(transactions, budgets);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddTransaction = async () => {
    // Validate input with Zod
    const result = transactionSchema.safeParse({
      description: newTransaction.description,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      type: newTransaction.type,
      date: new Date().toISOString().split('T')[0]
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: formatZodError(result.error),
        variant: "destructive"
      });
      return;
    }

    const success = await addTransaction(result.data);

    if (success) {
      // Update budget spent amount if it's an expense
      if (result.data.type === 'expense') {
        const matchingBudget = budgets.find(budget => 
          budget.category.toLowerCase() === result.data.category.toLowerCase()
        );
        if (matchingBudget) {
          await updateBudgetSpent(matchingBudget.id, matchingBudget.spent + result.data.amount);
        }
      }

      // Reset form
      setNewTransaction({
        description: "",
        amount: "",
        category: "",
        type: "expense"
      });
    }
  };

  const getAIInsight = (description: string, amount: number) => {
    const { category, confidence } = getCategoryRecommendation(description);
    
    // Auto-suggest category if not set and confidence is high
    if (!newTransaction.category && confidence > 0.8) {
      setNewTransaction(prev => ({ ...prev, category }));
    }
    
    if (description.toLowerCase().includes('coffee') || description.toLowerCase().includes('restaurant')) {
      return "💡 Consider setting a dining budget to track food expenses better!";
    }
    if (description.toLowerCase().includes('uber') || description.toLowerCase().includes('gas')) {
      return "🚗 Transportation costs are adding up - maybe consider carpooling?";
    }
    if (amount > 100) {
      return "💰 Large expense detected - make sure this aligns with your budget!";
    }
    return "✅ Transaction looks good!";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mobile-optimized Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-mobile-2xl font-bold gradient-text mb-2">Transactions</h1>
          <p className="text-mobile-sm text-muted-foreground">
            Add and manage your money flows
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <EnhancedCard className="animate-pulse">
            <div className="h-32 bg-muted rounded" />
          </EnhancedCard>
          {[...Array(3)].map((_, i) => (
            <EnhancedCard key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded" />
            </EnhancedCard>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile-optimized Add Transaction Form */}
          <EnhancedCard title="Add Transaction" variant="floating">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Coffee at Starbucks"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={newTransaction.category} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={newTransaction.type} onValueChange={(value: "income" | "expense") => setNewTransaction(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button onClick={handleAddTransaction} className="w-full touch-comfortable">
              <Plus className="h-5 w-5 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* AI Insight */}
        {newTransaction.description && newTransaction.amount && (
          <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm font-medium text-info-foreground">
              AI Insight: {getAIInsight(newTransaction.description, parseFloat(newTransaction.amount) || 0)}
            </p>
          </div>
        )}
      </EnhancedCard>

      {/* View Toggle and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TransactionViewToggle currentView={viewMode} onViewChange={setViewMode} />
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

          {/* Transaction Views */}
          {viewMode === 'plain' && (
            <TransactionPlainView 
              transactions={filteredTransactions}
              onDeleteTransaction={deleteTransaction}
              onUpdateTransaction={updateTransaction}
              getBudgetInsight={getBudgetImpactInsight}
            />
          )}
          
          {viewMode === 'dateGrouped' && (
            <TransactionDateGroupedView 
              transactions={filteredTransactions}
              onDeleteTransaction={deleteTransaction}
              getBudgetInsight={getBudgetImpactInsight}
            />
          )}
        </>
      )}
    </div>
  );
}