import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { SmartAlert } from '@/components/enhanced/SmartAlert';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircularProgress } from '@/components/enhanced/CircularProgress';
import { Plus, Edit2, Trash2, TrendingUp, AlertTriangle, Calculator, DollarSign, Zap, Calendar, Edit, PenTool, Clock, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { budgetSchema, formatZodError } from '@/lib/validation-schemas';

// Add DialogDescription and DialogFooter separately to avoid bundling issues
const DialogDescription = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => <p className={cn("text-sm text-muted-foreground", className)} {...props}>
    {children}
  </p>;
const DialogFooter = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props}>
    {children}
  </div>;
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
const BUDGET_CATEGORIES = ['Groceries', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Dining Out', 'Travel', 'Education', 'Other'];
const BUDGET_PERIODS = [{
  value: 'weekly',
  label: 'Weekly'
}, {
  value: 'monthly',
  label: 'Monthly'
}, {
  value: 'quarterly',
  label: 'Quarterly'
}, {
  value: 'yearly',
  label: 'Yearly'
}];
interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  period: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
export function BudgetManagement() {
  const {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    updateBudgetSpent,
    refetch,
    emailStatus
  } = useBudgets();
  // ...existing code...

  // Show email status message
  const [showEmailMsg, setShowEmailMsg] = useState(false);
  useEffect(() => {
    if (emailStatus) {
      setShowEmailMsg(true);
      const timer = setTimeout(() => setShowEmailMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [emailStatus]);
  const {
    toast
  } = useToast();
  const {
    formatCurrency,
    selectedCurrency
  } = useCurrency();
  const {
    alerts,
    criticalAlerts,
    dismissAlert,
    snoozeAlert
  } = useSmartAlerts();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Smart Period Controls
  const [globalViewPeriod, setGlobalViewPeriod] = useState('monthly');
  const [entryPeriods, setEntryPeriods] = useState<Record<string, string>>({});
  const [isGlobalAutoReverting, setIsGlobalAutoReverting] = useState(false);
  const [entryAutoReverting, setEntryAutoReverting] = useState<Record<string, boolean>>({});

  // Timer refs for auto-revert functionality
  const globalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const entryTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [formData, setFormData] = useState({
    category: '',
    allocated: '',
    period: 'monthly'
  });
  const [editFormData, setEditFormData] = useState({
    category: '',
    allocated: '',
    period: 'monthly'
  });

  // Smart period auto-revert functionality
  const startGlobalTimer = useCallback(() => {
    if (globalTimerRef.current) {
      clearTimeout(globalTimerRef.current);
    }
    setIsGlobalAutoReverting(true);
    globalTimerRef.current = setTimeout(() => {
      setGlobalViewPeriod('monthly');
      setIsGlobalAutoReverting(false);
      // Auto-reverted - no popup notification
    }, 5 * 60 * 1000); // 5 minutes
  }, [toast]);
  const startEntryTimer = useCallback((budgetId: string) => {
    if (entryTimersRef.current[budgetId]) {
      clearTimeout(entryTimersRef.current[budgetId]);
    }
    setEntryAutoReverting(prev => ({
      ...prev,
      [budgetId]: true
    }));
    entryTimersRef.current[budgetId] = setTimeout(() => {
      setEntryPeriods(prev => {
        const newPeriods = {
          ...prev
        };
        delete newPeriods[budgetId];
        return newPeriods;
      });
      setEntryAutoReverting(prev => {
        const newState = {
          ...prev
        };
        delete newState[budgetId];
        return newState;
      });
      // Auto-reverted - no popup notification
    }, 5 * 60 * 1000); // 5 minutes
  }, [toast]);
  const handleGlobalPeriodChange = useCallback((newPeriod: string) => {
    setGlobalViewPeriod(newPeriod);
    if (newPeriod !== 'monthly') {
      startGlobalTimer();
    } else {
      if (globalTimerRef.current) {
        clearTimeout(globalTimerRef.current);
        globalTimerRef.current = null;
      }
      setIsGlobalAutoReverting(false);
    }
  }, [startGlobalTimer]);
  const handleEntryPeriodChange = useCallback((budgetId: string, newPeriod: string) => {
    if (newPeriod === 'monthly') {
      setEntryPeriods(prev => {
        const newPeriods = {
          ...prev
        };
        delete newPeriods[budgetId];
        return newPeriods;
      });
      if (entryTimersRef.current[budgetId]) {
        clearTimeout(entryTimersRef.current[budgetId]);
        delete entryTimersRef.current[budgetId];
      }
      setEntryAutoReverting(prev => {
        const newState = {
          ...prev
        };
        delete newState[budgetId];
        return newState;
      });
    } else {
      setEntryPeriods(prev => ({
        ...prev,
        [budgetId]: newPeriod
      }));
      startEntryTimer(budgetId);
    }
  }, [startEntryTimer]);
  const getEffectivePeriod = (budgetId: string, defaultPeriod: string) => {
    return entryPeriods[budgetId] || defaultPeriod;
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (globalTimerRef.current) {
        clearTimeout(globalTimerRef.current);
      }
      Object.values(entryTimersRef.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);
  const handleAddBudget = async () => {
    // Validate input with Zod
    const result = budgetSchema.safeParse({
      category: formData.category,
      allocated: parseFloat(formData.allocated),
      spent: 0,
      period: formData.period
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: formatZodError(result.error),
        variant: "destructive"
      });
      return;
    }
    
    try {
      await addBudget(result.data);
      setFormData({
        category: '',
        allocated: '',
        period: 'monthly'
      });
      setIsAddDialogOpen(false);
      refetch();
      toast({
        title: "Budget Created",
        description: `Budget for ${formData.category} has been created successfully`,
      });
    } catch (error) {
      console.error('Failed to add budget:', error);
    }
  };
  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setEditFormData({
      category: budget.category,
      allocated: budget.allocated.toString(),
      period: budget.period
    });
    setIsEditDialogOpen(true);
  };
  const handleUpdateBudget = async () => {
    if (!selectedBudget) return;

    // Validate input with Zod
    const result = budgetSchema.safeParse({
      category: editFormData.category,
      allocated: parseFloat(editFormData.allocated),
      spent: selectedBudget.spent,
      period: editFormData.period
    });

    if (!result.success) {
      toast({
        title: "Validation Error",
        description: formatZodError(result.error),
        variant: "destructive"
      });
      return;
    }

    try {
      await updateBudget(selectedBudget.id, {
        category: result.data.category,
        allocated: result.data.allocated,
        period: result.data.period
      });
      setIsEditDialogOpen(false);
      setSelectedBudget(null);
      setEditFormData({
        category: '',
        allocated: '',
        period: 'monthly'
      });
      toast({
        title: "Budget Updated",
        description: `Budget for ${editFormData.category} has been updated successfully`,
      });
    } catch (error) {
      console.error('Failed to update budget:', error);
      toast({
        title: "Error",
        description: "Failed to update budget. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDeleteDialogOpen(true);
  };
  const confirmDeleteBudget = async () => {
    if (!selectedBudget) return;
    try {
      await deleteBudget(selectedBudget.id);
      setIsDeleteDialogOpen(false);
      setSelectedBudget(null);
      toast({
        title: "Budget Deleted",
        description: `Budget for ${selectedBudget.category} has been deleted`,
      });
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget. Please try again.",
        variant: "destructive"
      });
    }
  };
  const getBudgetStatus = (budget: Budget) => {
    const percentage = budget.spent / budget.allocated * 100;
    if (percentage >= 100) return {
      variant: 'destructive' as const,
      label: 'Over Budget'
    };
    if (percentage >= 90) return {
      variant: 'secondary' as const,
      label: 'Near Limit'
    };
    if (percentage >= 75) return {
      variant: 'secondary' as const,
      label: 'On Track'
    };
    return {
      variant: 'default' as const,
      label: 'Under Budget'
    };
  };

  // Period normalization factors to convert to monthly
  const getPeriodFactor = (budgetPeriod: string, targetPeriod: string) => {
    const factors: Record<string, number> = {
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      yearly: 1
    };
    const budgetYearly = factors[budgetPeriod];
    const targetYearly = factors[targetPeriod];
    return budgetYearly / targetYearly;
  };
  const normalizeBudgetAmount = (amount: number, fromPeriod: string, toPeriod: string) => {
    return amount * getPeriodFactor(fromPeriod, toPeriod);
  };
  
  // Total calculations use only global values, independent of individual card views
  const getTotalBudget = () => {
    return budgets.reduce((sum, b) => sum + normalizeBudgetAmount(b.allocated, b.period, globalViewPeriod), 0);
  };
  const getTotalSpent = () => {
    return budgets.reduce((sum, b) => sum + normalizeBudgetAmount(b.spent, b.period, globalViewPeriod), 0);
  };
  const getRemainingBudget = () => getTotalBudget() - getTotalSpent();
  const getViewPeriodLabel = (period: string) => {
    return BUDGET_PERIODS.find(p => p.value === period)?.label || 'Monthly';
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Budget Management</h1>
          <p className="text-muted-foreground">Loading your budgets...</p>
        </div>
      </div>;
  }
  const budgetAlerts = alerts.filter(alert => alert.type === 'budget');
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mobile Header */}
      <div className="pt-4 px-4">
        <h1 className="text-lg font-bold text-foreground">
          Smart Budget
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered budget tracking with intelligent alerts and insights
        </p>
        {/* Add Budget Button */}
        <div className="px-4 mt-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-11">
                <Plus className="h-4 w-4 mr-2" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Budget</DialogTitle>
                <DialogDescription>
                  Set up a spending limit for a specific category and time period.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  category: value
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map((category, index) => <SelectItem key={`${category}-${index}`} value={category}>
                          {category}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="allocated">Budget Amount ({selectedCurrency.symbol})</Label>
                  <Input id="allocated" type="number" placeholder="0.00" value={formData.allocated} onChange={e => setFormData(prev => ({
                  ...prev,
                  allocated: e.target.value
                }))} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select value={formData.period} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  period: value
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_PERIODS.map(period => <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBudget}>
                  Create Budget
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Global View Period Selector */}
      <div className="flex items-center justify-between bg-card/50 rounded-lg p-4 border border-border/50">
        <div className="space-y-1">
          <h3 className="font-medium">Global View As - Board Totals</h3>
          <p className="text-sm text-muted-foreground">
            Controls calculation for Total Budget, Total Spent, and Remaining amounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="view-period" className="text-sm font-medium">
            View as:
          </Label>
          <Select value={globalViewPeriod} onValueChange={handleGlobalPeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_PERIODS.map(period => <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
          {isGlobalAutoReverting && <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Clock className="h-3 w-3" />
              <span>Auto-reverting...</span>
            </div>}
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnhancedCard title={`Total ${getViewPeriodLabel(globalViewPeriod)} Budget`} value={getTotalBudget()} icon={<DollarSign className="h-4 w-4" />} variant="budget" />
        <EnhancedCard title={`Total ${getViewPeriodLabel(globalViewPeriod)} Spent`} value={getTotalSpent()} icon={<DollarSign className="h-4 w-4" />} variant="budget" />
        <EnhancedCard title={`${getViewPeriodLabel(globalViewPeriod)} Remaining`} value={getRemainingBudget()} icon={<DollarSign className="h-4 w-4" />} variant={getRemainingBudget() > 0 ? "success" : "budget"} />
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Budget Categories</h2>
        
        {budgets.length === 0 ? <EnhancedCard variant="budget" layout="vertical" title="No budgets created yet" description="Start by creating your first budget to track spending by category." icon={<DollarSign className="h-8 w-8 text-muted-foreground" />} className="py-8">
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 mt-4">
              <Plus className="h-4 w-4" />
              Create Your First Budget
            </Button>
          </EnhancedCard> : <div className="grid gap-4 md:grid-cols-2">
            {budgets.map(budget => {
          const effectivePeriod = getEffectivePeriod(budget.id, budget.period);
          const normalizedAllocated = normalizeBudgetAmount(budget.allocated, budget.period, effectivePeriod);
          const normalizedSpent = normalizeBudgetAmount(budget.spent, budget.period, effectivePeriod);
          const percentage = normalizedSpent / normalizedAllocated * 100;
          const status = getBudgetStatus({
            ...budget,
            allocated: normalizedAllocated,
            spent: normalizedSpent
          });
          const isOverBudget = percentage >= 100;
          return <EnhancedCard key={budget.id} variant="budget" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{budget.category}</h3>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground capitalize">
                          {effectivePeriod}
                        </span>
                        {entryAutoReverting[budget.id] && <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Auto-reverting...</span>
                          </div>}
                      </div>
                    </div>
                    <Badge variant={status.variant} className="gap-1">
                      {isOverBudget && <AlertTriangle className="h-3 w-3" />}
                      {status.label}
                    </Badge>
                  </div>
                  
                  {/* Per-Entry Period Control */}
                  <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Per-Entry Period:</Label>
                      <div className="flex items-center gap-2">
                        <Select value={effectivePeriod} onValueChange={value => handleEntryPeriodChange(budget.id, value)}>
                          <SelectTrigger className="w-24 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUDGET_PERIODS.map(period => <SelectItem key={period.value} value={period.value}>
                                {period.label}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        {effectivePeriod !== 'monthly' && <Button variant="ghost" size="sm" onClick={() => handleEntryPeriodChange(budget.id, 'monthly')} className="h-7 w-7 p-0" title="Reset to Monthly">
                            <RotateCcw className="h-3 w-3" />
                          </Button>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Spent</span>
                      <span className={cn("font-medium", isOverBudget && "text-destructive")}>
                        {formatCurrency(normalizedSpent)} / {formatCurrency(normalizedAllocated)}
                      </span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className={cn("h-2", isOverBudget && "bg-destructive/20")} />
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}% used
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => handleEditBudget(budget)}>
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="default" size="sm" className="gap-1 flex-1" onClick={() => {
                const newAmount = window.prompt(`Update spent amount for ${budget.category}:`, budget.spent.toString());
                if (newAmount && !isNaN(parseFloat(newAmount))) {
                  updateBudgetSpent(budget.id, parseFloat(newAmount));
                  toast({
                    title: "Budget Updated",
                    description: `Spent amount updated for ${budget.category}`,
                  });
                } else if (newAmount !== null) {
                  toast({
                    title: "Invalid Amount",
                    description: "Please enter a valid number",
                    variant: "destructive"
                  });
                }
              }}>
                      <PenTool className="h-3 w-3" />
                      Update
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1 flex-1" onClick={() => handleDeleteBudget(budget)}>
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </EnhancedCard>;
        })}
          </div>}
      </div>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update the details for your budget category.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editFormData.category} onValueChange={value => setEditFormData(prev => ({
              ...prev,
              category: value
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((category, index) => <SelectItem key={`edit-${category}-${index}`} value={category}>
                      {category}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-allocated">Budget Amount ({selectedCurrency.symbol})</Label>
              <Input id="edit-allocated" type="number" placeholder="0.00" value={editFormData.allocated} onChange={e => setEditFormData(prev => ({
              ...prev,
              allocated: e.target.value
            }))} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-period">Period</Label>
              <Select value={editFormData.period} onValueChange={value => setEditFormData(prev => ({
              ...prev,
              period: value
            }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map(period => <SelectItem key={`edit-${period.value}`} value={period.value}>
                      {period.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBudget}>
              Update Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email status message */}
      {showEmailMsg && emailStatus && (
        <div style={{
          background: emailStatus.success ? '#22c55e' : '#ef4444',
          color: 'white',
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '12px',
          textAlign: 'center',
          fontWeight: 'bold',
        }}>
          {emailStatus.message}
        </div>
      )}
      {/* Delete Budget Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for "{selectedBudget?.category}"? 
              This will remove the budget with {selectedBudget?.allocated ? formatCurrency(selectedBudget.allocated) : '£0'} allocated. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setIsDeleteDialogOpen(false);
            setSelectedBudget(null);
          }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBudget} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Budget
            </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
}