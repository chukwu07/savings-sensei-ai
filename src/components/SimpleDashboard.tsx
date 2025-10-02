import { useState, useEffect } from "react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Plus, Edit, Save, X, Trash2, AlertCircle, CheckCircle2, Brain, Zap, Target, Sparkles, AlertTriangle, Home } from "lucide-react";
import { useOfflineTransactions } from "@/hooks/useOfflineTransactions";
import { useOfflineBudgets } from "@/hooks/useOfflineBudgets";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCategoryFromDescription, getEmojiForCategory } from "@/lib/emojiCategories";
import { cn } from "@/lib/utils";
import { CircularProgress } from "@/components/enhanced/CircularProgress";
import { SmartAlert } from "@/components/enhanced/SmartAlert";
import { SwipeableCard } from "@/components/enhanced/SwipeableCard";
import { AchievementBadge } from "@/components/enhanced/AchievementBadge";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useAchievements } from "@/hooks/useAchievements";
import { BudgetAlertCard } from "@/components/BudgetAlertCard";
import { PremiumBadge } from "@/components/premium/PremiumBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  'food', 'transport', 'shopping', 'housing', 'healthcare', 
  'entertainment', 'education', 'income', 'gifts', 'services'
];

export function SimpleDashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, loading } = useOfflineTransactions();
  const { budgets, updateBudgetSpent } = useOfflineBudgets();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { alerts, dismissAlert, snoozeAlert } = useSmartAlerts();
  const { achievements, checkAchievements, getRecentlyEarned } = useAchievements();
  const { user } = useAuth();
  // Profile data state
  const [userProfile, setUserProfile] = useState<{ display_name?: string } | null>(null);

  // Deep email alert trigger for budgets
    // ...existing code...
  
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
  // Calculate accurate financial metrics
  const moneyIn = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const moneyOut = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  // Left to spend should be the actual difference between income and expenses
  const leftToSpend = moneyIn - moneyOut;

  // Enhanced smart spending health system - updates in real-time
  const getSpendingHealth = () => {
    // Calculate based on actual transaction data for real-time updates
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const actualSpent = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate health score based on actual spending vs income and budgets
    const healthScore = totalBudget > 0 
      ? Math.max(0, Math.min(100, ((totalBudget - actualSpent) / totalBudget) * 100))
      : (leftToSpend >= 0 ? 100 : Math.max(0, 100 - Math.abs(leftToSpend / (moneyIn || 1)) * 100));
    
    // Calculate spending velocity based on real transaction data
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const expectedSpentPercentage = (currentDay / daysInMonth) * 100;
    const actualSpentPercentage = totalBudget > 0 ? (actualSpent / totalBudget) * 100 : 0;
    const spendingVelocity = actualSpentPercentage - expectedSpentPercentage;

    if (healthScore <= 10) return {
      variant: 'critical' as const,
      score: healthScore,
      message: 'Financial Emergency!',
      description: 'Immediate action needed to avoid debt',
      icon: AlertCircle,
      advice: 'Stop all non-essential spending and review your budget immediately.'
    };
    
    if (healthScore <= 25 || spendingVelocity > 20) return {
      variant: 'urgent' as const,
      score: healthScore,
      message: 'Budget Alert!',
      description: `Spending ${spendingVelocity > 0 ? spendingVelocity.toFixed(1) + '% faster than expected' : 'too fast'}`,
      icon: AlertTriangle,
      advice: 'Consider reducing discretionary spending this month.'
    };
    
    if (healthScore <= 50 || spendingVelocity > 10) return {
      variant: 'warning' as const,
      score: healthScore,
      message: 'Watch Your Spending',
      description: 'Getting close to your limits',
      icon: AlertCircle,
      advice: 'Track your spending more carefully for the rest of the month.'
    };
    
    return {
      variant: 'success' as const,
      score: healthScore,
      message: 'Financial Health Excellent!',
      description: 'You\'re crushing your financial goals',
      icon: CheckCircle2,
      advice: 'Keep up the great work! Consider boosting your savings goals.'
    };
  };

  // AI-powered insights
  const getAIInsights = () => {
    const insights = [];
    const recentTransactions = transactions.slice(0, 10);
    
    // Spending pattern analysis
    const categorySpending = recentTransactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categorySpending).sort(([,a], [,b]) => b - a)[0];
    if (topCategory) {
      insights.push({
        type: 'spending',
        message: `Your top spending category is ${topCategory[0]} at ${formatCurrency(topCategory[1])} this period.`,
        suggestion: 'Consider if there are ways to optimize this category.'
      });
    }

    // Weekly comparison
    const thisWeek = transactions.filter(t => {
      const date = new Date(t.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo && t.type === 'expense';
    });
    
    const thisWeekSpending = thisWeek.reduce((sum, t) => sum + t.amount, 0);
    
    if (thisWeekSpending > 0) {
      insights.push({
        type: 'trend',
        message: `You've spent ${formatCurrency(thisWeekSpending)} this week.`,
        suggestion: 'Try the 24-hour rule: wait a day before making non-essential purchases.'
      });
    }

    return insights;
  };

  // Recalculate health status when transactions or budgets change
  const healthStatus = getSpendingHealth();
  const aiInsights = getAIInsights();
  const recentAchievements = getRecentlyEarned();

  // Fetch user profile for personalized greeting
  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
          
          if (data && !error) {
            setUserProfile(data);
          }
        } catch (error) {
          // Silently handle error - greeting will fall back to generic
          console.log('Profile fetch failed:', error);
        }
      };
      fetchProfile();
    }
  }, [user?.id]);

  // Update achievements based on user activity - updates in real-time
  useEffect(() => {
    const goalsCreated = 1; // This would come from actual goals data
    const goalsCompleted = 0;
    const savingStreak = 5;
    const budgetStreak = 15;
    const transactionStreak = transactions.length;
    const milestonesReached = 2;
    const smartDecisions = 3;

    checkAchievements({
      goalsCreated,
      goalsCompleted, 
      savingStreak,
      budgetStreak,
      transactionStreak,
      milestonesReached,
      smartDecisions
    });
  }, [transactions.length, budgets.length, checkAchievements]); // Include budgets for real-time updates

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

      toast({
        title: "✅ Expense added!",
        description: `Spent ${formatCurrency(amount)}`,
      });
      
      setAddExpenseAmount("");
      setAddExpenseDescription("");
      setAddExpenseCategory("shopping");
  }
  catch (error) {
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

      toast({
        title: "✅ Income added!",
        description: `Earned ${formatCurrency(amount)}`,
      });
      
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
        // Update budget spent and trigger alert if needed
        const budget = budgets.find(b => b.category === editForm.category);
        if (budget) {
          const newSpent = budget.spent + parseFloat(editForm.amount);
          await updateBudgetSpent(budget.id, newSpent);
          const percentUsed = (newSpent / budget.allocated) * 100;
          if (percentUsed >= 80) {
            await fetch('/api/send-budget-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user?.id,
                category: budget.category,
                budget_allocated: budget.allocated,
                budget_spent: newSpent,
                percentage_used: percentUsed,
                alert_type: percentUsed >= 100 ? 'exceeded_100' : 'warning_90',
              }),
            });
          }
        }
      
      toast({
        title: "✅ Updated!",
        description: "Transaction updated successfully",
      });
      
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
      toast({
        title: "✅ Deleted!",
        description: "Transaction removed",
      });
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
          <h1 className="text-mobile-2xl font-bold mb-2">Getting your money info...</h1>
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
          {userProfile?.display_name 
            ? `Welcome, ${userProfile.display_name.split(' ')[0]}!`
            : "Welcome!"
          }
        </h1>
      </div>

      {/* Smart Financial Health Status */}
      <EnhancedCard 
        variant="default"
        className="text-center"
      >
        <div className="space-y-4 p-6">
          <div className="flex justify-center">
            <CircularProgress
              value={healthStatus.score}
              variant={
                healthStatus.variant === 'success' ? 'success' :
                healthStatus.variant === 'warning' ? 'warning' :
                'destructive'
              }
              size={100}
              strokeWidth={8}
              animated
              showMilestones
            >
              <div className="text-center">
                <div className="text-mobile-lg font-bold">
                  {Math.round(healthStatus.score)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Health Score
                </div>
              </div>
            </CircularProgress>
          </div>
          <div className="space-y-2">
            <h2 className="text-mobile-lg font-semibold">{healthStatus.message}</h2>
            <p className="text-mobile-sm text-muted-foreground/80">{healthStatus.description}</p>
            <p className="text-xs text-primary font-medium">{healthStatus.advice}</p>
          </div>
        </div>
      </EnhancedCard>

      {/* Budget Alert Card - Only for Home Screen */}
      <BudgetAlertCard />

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <EnhancedCard variant="default" className="relative overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-mobile-lg">🎉 New Achievement!</h3>
                <p className="text-mobile-sm text-muted-foreground">You're making great progress</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentAchievements.map(achievement => (
                <AchievementBadge
                  key={achievement.type}
                  type={achievement.type}
                  earned={achievement.earned}
                  showAnimation
                />
              ))}
            </div>
          </div>
          {/* Celebration confetti effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-4 w-1 h-1 bg-primary rounded-full animate-ping" style={{animationDelay: '0s'}} />
            <div className="absolute top-6 right-8 w-1 h-1 bg-success rounded-full animate-ping" style={{animationDelay: '0.5s'}} />
            <div className="absolute bottom-4 left-12 w-1 h-1 bg-warning rounded-full animate-ping" style={{animationDelay: '1s'}} />
          </div>
        </EnhancedCard>
      )}

      {/* Quick Overview Cards */}
      <div className="space-y-3 px-4">
        <EnhancedCard className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Money In</p>
              <p className="text-base font-bold text-success">{formatCurrency(moneyIn)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Money Out</p>
              <p className="text-base font-bold text-destructive">{formatCurrency(moneyOut)}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{leftToSpend >= 0 ? "Available to Spend" : "Over Budget"}</p>
              <p className={cn("text-base font-bold", leftToSpend >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(Math.abs(leftToSpend))}
              </p>
            </div>
            <Target className="h-5 w-5" />
          </div>
        </EnhancedCard>
      </div>

      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <EnhancedCard variant="glass" className="relative overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full">
                <Brain className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-mobile-lg">🤖 AI Financial Insights</h3>
                <p className="text-mobile-sm text-muted-foreground">Personalized advice for you</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiInsights.map((insight, index) => (
                <div key={index} className="p-3 bg-card/50 rounded-lg border border-border/50">
                  <p className="text-mobile-sm font-medium text-foreground/90">{insight.message}</p>
                  <p className="text-xs text-primary mt-1">{insight.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full transform translate-x-10 -translate-y-10" />
        </EnhancedCard>
      )}
    </div>
  );
} 