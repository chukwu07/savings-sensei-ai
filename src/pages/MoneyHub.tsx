import { useState } from "react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Save, X, Trash2, DollarSign, CreditCard, Wallet } from "lucide-react";
import { useOfflineTransactions } from "@/hooks/useOfflineTransactions";
import { useOfflineBudgets } from "@/hooks/useOfflineBudgets";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCategoryFromDescription, getEmojiForCategory } from "@/lib/emojiCategories";
import { cn } from "@/lib/utils";
import { SwipeableCard } from "@/components/enhanced/SwipeableCard";
import { Label } from "@/components/ui/label";

const categories = [
  'food', 'transport', 'shopping', 'housing', 'healthcare', 
  'entertainment', 'education', 'income', 'gifts', 'services'
];

export default function MoneyHub() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, loading } = useOfflineTransactions();
  const { budgets, updateBudgetSpent } = useOfflineBudgets();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  // Add expense state
  const [addExpenseAmount, setAddExpenseAmount] = useState("");
  const [addExpenseDescription, setAddExpenseDescription] = useState("");
  const [addExpenseCategory, setAddExpenseCategory] = useState("shopping");
  
  // Add income state
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [addIncomeAmount, setAddIncomeAmount] = useState("");
  const [addIncomeDescription, setAddIncomeDescription] = useState("");

  // Edit transaction state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    date: ''
  });

  // Delete confirmation state
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // Add expense handler
  const handleAddExpense = async () => {
    if (!addExpenseAmount || Number(addExpenseAmount) <= 0) return;
    
    try {
      const amount = Number(addExpenseAmount);
      const category = addExpenseCategory || getCategoryFromDescription(addExpenseDescription);
      
      await addTransaction({
        description: addExpenseDescription || `${getEmojiForCategory(category)} Expense`,
        amount: amount,
        category: category,
        type: 'expense' as const,
        date: new Date().toISOString().split('T')[0]
      });

      // Update budget
      const budget = budgets.find(b => b.category === category);
      if (budget) {
        await updateBudgetSpent(budget.id, budget.spent + amount);
      }

      // Success - no popup notification
      
      setAddExpenseAmount("");
      setAddExpenseDescription("");
      setAddExpenseCategory("shopping");
    } catch (error) {
      toast({
        title: "Oops!",
        description: "Couldn't save that expense. Try again?",
        variant: "destructive"
      });
    }
  };

  // Add income handler
  const handleAddIncome = async () => {
    if (!addIncomeAmount || Number(addIncomeAmount) <= 0) return;
    
    try {
      const amount = Number(addIncomeAmount);
      
      await addTransaction({
        description: addIncomeDescription || "💰 Income",
        amount: amount,
        category: 'income',
        type: 'income' as const,
        date: new Date().toISOString().split('T')[0]
      });

      // Success - no popup notification
      
      setAddIncomeAmount("");
      setAddIncomeDescription("");
      setShowAddIncome(false);
    } catch (error) {
      toast({
        title: "Oops!",
        description: "Couldn't save that income. Try again?",
        variant: "destructive"
      });
    }
  };

  // Edit transaction handlers
  const startEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setEditForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      type: transaction.type,
      date: transaction.date.split('T')[0]
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      await updateTransaction(editingId, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        type: editForm.type,
        date: editForm.date
      });
      
      // Success - no popup notification
      
      setEditingId(null);
    } catch (error) {
      toast({
        title: "Oops!",
        description: "Couldn't update that transaction. Try again?",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      // Success - no popup notification
      setDeletingTransactionId(null);
    } catch (error) {
      toast({
        title: "Oops!",
        description: "Couldn't delete that transaction. Try again?",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (transactionId: string) => {
    setDeletingTransactionId(transactionId);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-mobile-2xl font-bold mb-2">Loading Money Hub...</h1>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-edge-padding space-y-6 pb-4 animate-fade-in">
      {/* Mobile Header */}
      <div className="pt-4 px-4">
        <h1 className="text-lg font-bold text-foreground">
          Money Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your central place to add income, track expenses, and review your money activity—all in one spot
        </p>
      </div>

      {/* Add Transaction Section */}
      <div className="px-4 space-y-4">
        <h2 className="text-base font-semibold">Add Transaction</h2>
        <div className="space-y-3">
          {/* Add Income Button/Form */}
          {!showAddIncome ? (
            <EnhancedCard className="p-3">
              <Button
                onClick={() => setShowAddIncome(true)}
                className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </EnhancedCard>
          ) : (
            <EnhancedCard className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-success">💵 Add Income</h3>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={addIncomeAmount}
                  onChange={(e) => setAddIncomeAmount(e.target.value)}
                  className="text-mobile-base"
                />
                <Input
                  placeholder="Description (optional)"
                  value={addIncomeDescription}
                  onChange={(e) => setAddIncomeDescription(e.target.value)}
                  className="text-mobile-base"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddIncome}
                    disabled={!addIncomeAmount || Number(addIncomeAmount) <= 0}
                    className="flex-1 bg-success hover:bg-success/90"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setShowAddIncome(false);
                      setAddIncomeAmount("");
                      setAddIncomeDescription("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </EnhancedCard>
          )}

          {/* Add Expense Form */}
          <EnhancedCard className="p-3">
            <div className="space-y-3">
              <h3 className="font-medium text-destructive text-sm">💳 Add Expense</h3>
              <Input
                type="number"
                placeholder="Amount"
                value={addExpenseAmount}
                onChange={(e) => setAddExpenseAmount(e.target.value)}
                className="text-mobile-base"
              />
              <Input
                placeholder="Description (optional)"
                value={addExpenseDescription}
                onChange={(e) => setAddExpenseDescription(e.target.value)}
                className="text-mobile-base"
              />
              <Select value={addExpenseCategory} onValueChange={setAddExpenseCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => cat !== 'income').map(category => (
                    <SelectItem key={category} value={category}>
                      {getEmojiForCategory(category)} {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddExpense}
                disabled={!addExpenseAmount || Number(addExpenseAmount) <= 0}
                className="w-full bg-destructive hover:bg-destructive/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>
          </EnhancedCard>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="px-4 space-y-4">
        <h2 className="text-base font-semibold">Recent Transactions</h2>
        
        {transactions.length === 0 ? (
          <EnhancedCard className="text-center p-8">
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No transactions yet</h3>
              <p className="text-mobile-sm text-muted-foreground">
                Add your first transaction above to get started!
              </p>
            </div>
          </EnhancedCard>
        ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((transaction) => (
                <SwipeableCard 
                  key={transaction.id} 
                  onEdit={() => startEdit(transaction)}
                  onDelete={() => confirmDelete(transaction.id)}
                  className="p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {getEmojiForCategory(transaction.category)}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      "font-semibold text-sm",
                      transaction.type === 'income' ? "text-success" : "text-destructive"
                    )}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </SwipeableCard>
              ))}
            </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransactionId} onOpenChange={(open) => !open && setDeletingTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTransactionId && handleDeleteTransaction(deletingTransactionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <AlertDialog open={!!editingId} onOpenChange={(open) => !open && cancelEdit()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Make changes to your transaction details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Transaction description"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm(prev => ({...prev, amount: e.target.value}))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({...prev, category: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {getEmojiForCategory(category)} {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelEdit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEdit}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}