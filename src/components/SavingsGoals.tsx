import { useState } from "react";
import { CircularProgress } from "@/components/enhanced/CircularProgress";
import { AchievementBadge } from "@/components/enhanced/AchievementBadge";
import { SwipeableCard } from "@/components/enhanced/SwipeableCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Target, Plus, Calendar, DollarSign, TrendingUp, Edit2, Trash2, Save, X, CheckCircle, Zap, Trophy, Star, Sparkles } from "lucide-react";
import { formatCurrencyShort } from "@/utils/formatters";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
export function SavingsGoals() {
  console.log('SavingsGoals component loading');
  const [newGoal, setNewGoal] = useState({
    name: "",
    target: "",
    current: "",
    deadline: ""
  });
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    deadline: ""
  });
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const {
    toast
  } = useToast();
  const {
    formatCurrency
  } = useCurrency();
  const {
    goals,
    loading,
    addGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal
  } = useSavingsGoals();
  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.target || !newGoal.deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill in all goal details.",
        variant: "destructive"
      });
      return;
    }
    const success = await addGoal({
      name: newGoal.name,
      target_amount: parseFloat(newGoal.target),
      current_amount: parseFloat(newGoal.current) || 0,
      deadline: newGoal.deadline
    });
    if (success) {
      // Calculate monthly contribution needed
      const target = parseFloat(newGoal.target);
      const current = parseFloat(newGoal.current) || 0;
      const remaining = target - current;
      const deadline = new Date(newGoal.deadline);
      const today = new Date();
      const monthsRemaining = Math.max(1, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const monthlyContribution = Math.ceil(remaining / monthsRemaining);
      toast({
        title: "Goal Created!",
        description: `You'll need to save ${formatCurrency(monthlyContribution)}/month to reach your goal.`
      });

      // Reset form
      setNewGoal({
        name: "",
        target: "",
        current: "",
        deadline: ""
      });
    }
  };
  const calculateProgress = (current: number, target: number) => {
    return Math.min(100, current / target * 100);
  };
  const calculateMonthsRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const monthsRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, monthsRemaining);
  };
  const getGoalStatus = (current: number, target: number, deadline: string) => {
    const progress = calculateProgress(current, target);
    const monthsRemaining = calculateMonthsRemaining(deadline);
    if (progress >= 100) return {
      status: "completed",
      color: "success"
    };
    if (monthsRemaining <= 1 && progress < 90) return {
      status: "urgent",
      color: "destructive"
    };
    if (progress >= 75) return {
      status: "on-track",
      color: "success"
    };
    if (progress >= 50) return {
      status: "good",
      color: "warning"
    };
    return {
      status: "needs-attention",
      color: "info"
    };
  };
  const getAchievementType = (progress: number) => {
    if (progress >= 100) return "goal-crusher";
    if (progress >= 75) return "consistent-saver";
    if (progress >= 50) return "milestone-achiever";
    if (progress >= 25) return "first-goal";
    return null;
  };
  const getMilestoneMessage = (progress: number) => {
    if (progress >= 100) return "🎉 Goal achieved! You're a savings champion!";
    if (progress >= 75) return "⭐ Amazing progress! You're almost there!";
    if (progress >= 50) return "🚀 Halfway there! Keep up the momentum!";
    if (progress >= 25) return "💪 Great start! You're building good habits!";
    return "🌱 Every step counts! You've got this!";
  };
  const handleQuickContribution = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: true
    }));
    await updateGoalProgress(goalId, goal.current_amount + amount);
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: false
    }));
    const newProgress = calculateProgress(goal.current_amount + amount, goal.target_amount);
    if (newProgress >= 100) {
      toast({
        title: "🎉 Goal Completed!",
        description: "Congratulations! You've reached your savings goal!"
      });
    }
  };
  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal.id);
    setEditForm({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      deadline: goal.deadline
    });
  };
  const handleSaveEdit = async (goalId: string) => {
    if (!editForm.name || !editForm.target_amount || !editForm.deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill in all goal details.",
        variant: "destructive"
      });
      return;
    }
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: true
    }));
    const success = await updateGoal(goalId, {
      name: editForm.name,
      target_amount: parseFloat(editForm.target_amount),
      current_amount: parseFloat(editForm.current_amount),
      deadline: editForm.deadline
    });
    if (success) {
      setEditingGoal(null);
    }
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: false
    }));
  };
  const handleCancelEdit = () => {
    setEditingGoal(null);
    setEditForm({
      name: "",
      target_amount: "",
      current_amount: "",
      deadline: ""
    });
  };
  const handleDeleteGoal = async (goalId: string) => {
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: true
    }));
    await deleteGoal(goalId);
    setLoadingActions(prev => ({
      ...prev,
      [goalId]: false
    }));
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Savings Goals</h1>
          <p className="text-muted-foreground">Loading your savings goals...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <EnhancedCard key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded" />
            </EnhancedCard>)}
        </div>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      {/* Mobile Header */}
      <div className="pt-4 px-4">
        <h1 className="text-lg font-bold text-foreground">
          Goals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set and track your financial objectives with AI-powered insights
        </p>
      </div>

      {/* Add New Goal Form */}
      <EnhancedCard title="Create New Savings Goal" variant="goals">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input id="goal-name" placeholder="e.g., Vacation Fund" value={newGoal.name} onChange={e => setNewGoal(prev => ({
            ...prev,
            name: e.target.value
          }))} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target-amount">Target Amount</Label>
            <Input id="target-amount" type="number" placeholder="0.00" value={newGoal.target} onChange={e => setNewGoal(prev => ({
            ...prev,
            target: e.target.value
          }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-amount">Current Amount</Label>
            <Input id="current-amount" type="number" placeholder="0.00" value={newGoal.current} onChange={e => setNewGoal(prev => ({
            ...prev,
            current: e.target.value
          }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={newGoal.deadline} onChange={e => setNewGoal(prev => ({
            ...prev,
            deadline: e.target.value
          }))} />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleAddGoal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Goal
          </Button>
        </div>

        {/* AI Recommendation - Always visible when creating a goal */}
        <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-primary/10 rounded-full">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <h4 className="font-medium text-primary">💡 AI Smart Recommendation</h4>
          </div>
          {newGoal.target && newGoal.deadline ? (
            <p className="text-sm text-foreground">
              Based on your timeline, you'll need to save approximately <span className="font-semibold text-primary">{formatCurrency(Math.ceil((parseFloat(newGoal.target) - (parseFloat(newGoal.current) || 0)) / Math.max(1, calculateMonthsRemaining(newGoal.deadline))))}</span> per month.
              Consider setting up automatic transfers to make this easier!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter your target amount and deadline to get personalized savings recommendations from our AI assistant.
            </p>
          )}
        </div>
      </EnhancedCard>

      {/* Existing Goals */}
      <div className="grid gap-6 md:grid-cols-2">
        {goals.map(goal => {
        const progress = calculateProgress(goal.current_amount, goal.target_amount);
        const monthsRemaining = calculateMonthsRemaining(goal.deadline);
        const goalStatus = getGoalStatus(goal.current_amount, goal.target_amount, goal.deadline);
        const monthlyContribution = Math.ceil((goal.target_amount - goal.current_amount) / Math.max(1, monthsRemaining));
        const achievementType = getAchievementType(progress);
        return <SwipeableCard key={goal.id} onEdit={() => handleEditGoal(goal)} onDelete={() => handleDeleteGoal(goal.id)} className="h-full">
              <EnhancedCard variant={goalStatus.status === "completed" ? "success" : "goals"} className="space-y-6 h-full">
              {editingGoal === goal.id ?
            // Edit Mode
            <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Edit Goal</h3>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(goal.id)} disabled={loadingActions[goal.id]}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={loadingActions[goal.id]}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-name-${goal.id}`}>Goal Name</Label>
                      <Input id={`edit-name-${goal.id}`} value={editForm.name} onChange={e => setEditForm(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`edit-target-${goal.id}`}>Target Amount</Label>
                      <Input id={`edit-target-${goal.id}`} type="number" value={editForm.target_amount} onChange={e => setEditForm(prev => ({
                    ...prev,
                    target_amount: e.target.value
                  }))} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`edit-current-${goal.id}`}>Current Amount</Label>
                      <Input id={`edit-current-${goal.id}`} type="number" value={editForm.current_amount} onChange={e => setEditForm(prev => ({
                    ...prev,
                    current_amount: e.target.value
                  }))} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`edit-deadline-${goal.id}`}>Deadline</Label>
                      <Input id={`edit-deadline-${goal.id}`} type="date" value={editForm.deadline} onChange={e => setEditForm(prev => ({
                    ...prev,
                    deadline: e.target.value
                  }))} />
                    </div>
                  </div>
                </div> :
            // View Mode
            <>
                  {/* Header Section */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <CircularProgress value={progress} size={64} strokeWidth={6} className="text-primary" variant={goalStatus.color === "success" ? "success" : "default"} showMilestones={true} animated={true}>
                          <div className="text-xs font-bold">{Math.round(progress)}%</div>
                        </CircularProgress>
                        {progress >= 100 && <div className="absolute -top-2 -right-2 animate-gentle-pulse">
                            <Trophy className="h-6 w-6 text-warning fill-warning drop-shadow-sm" />
                          </div>}
                      </div>
                      <div>
                        <h3 className="font-semibold text-mobile-base flex items-center gap-2 min-w-0">
                          <span className="truncate flex-1">{goal.name}</span>
                          {progress >= 100 && <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />}
                        </h3>
                        <p className="text-mobile-sm text-muted-foreground truncate">
                          {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                        </p>
                        <p className="text-xs text-primary font-medium">
                          {getMilestoneMessage(progress)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Achievement Badge */}
                    {achievementType && <AchievementBadge type={achievementType} earned={true} className="shrink-0" />}
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center mb-4">
                    
                  </div>
                </>}

              {editingGoal !== goal.id && <>
                  {/* Trimmer Goals Layout */}
                  <EnhancedCard variant="goals" className="mb-6">
                    <div className="p-4">
                      <div className="space-y-3">
                        {/* Section 1: Monthly Target */}
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">💰</span>
                            <p className="text-xs text-black font-normal">
                              Monthly Target
                            </p>
                          </div>
                          <div className="text-sm font-normal text-black truncate">
                            {formatCurrency(monthlyContribution)}
                          </div>
                        </div>

                        {/* Section 2: Months Left */}
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">⏳</span>
                            <p className="text-xs text-black font-normal">
                              Months Left
                            </p>
                          </div>
                          <div className="text-sm font-normal text-black">
                            {monthsRemaining}
                          </div>
                        </div>

                        {/* Section 3: Remaining */}
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📅</span>
                            <p className="text-xs text-black font-normal">
                              Remaining
                            </p>
                          </div>
                          <div className="text-sm font-normal text-black truncate">
                            {formatCurrency(goal.target_amount - goal.current_amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </EnhancedCard>

                  {/* Enhanced Progress Visualization */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Goal Progress</span>
                      <span className={cn(
                        "text-sm font-bold",
                        progress >= 100 ? "text-success" :
                        progress >= 75 ? "text-primary" :
                        progress >= 50 ? "text-blue-600" :
                        "text-muted-foreground"
                      )}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    
                    <Progress 
                      value={progress} 
                      className={cn(
                        "h-4 transition-all duration-500 shadow-sm",
                        progress >= 100 && "animate-pulse"
                      )}
                    />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
                      <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                    </div>
                    
                    {/* Progress milestone indicator */}
                    {progress >= 25 && progress < 100 && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <span className="font-medium">
                          {progress >= 75 ? "🎯 Almost there!" :
                           progress >= 50 ? "⭐ Halfway!" :
                           "💪 Great start!"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Insights Enhanced */}
                  <div className={`p-4 rounded-lg border-l-4 ${goalStatus.color === 'success' ? 'bg-success/10 border-success' : goalStatus.color === 'warning' ? 'bg-warning/10 border-warning' : goalStatus.color === 'destructive' ? 'bg-destructive/10 border-destructive' : 'bg-info/10 border-info'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">AI Insight</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {progress >= 100 ? "🎉 Fantastic! You've crushed this goal. Time to set an even bigger challenge!" : progress >= 75 ? "⭐ Outstanding progress! You're in the home stretch - maintain this momentum!" : monthsRemaining <= 2 ? "🚨 Crunch time! Consider boosting your contributions to reach your goal." : progress >= 50 ? "🚀 Halfway milestone achieved! Your consistency is paying off beautifully." : progress >= 25 ? "💪 Solid foundation built! Consider setting up automatic transfers for steady growth." : "🌱 Great start! Every contribution builds towards your financial freedom."}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" size="sm" onClick={() => handleEditGoal(goal)} disabled={loadingActions[goal.id]} className="flex-1 hover-scale">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Goal
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={loadingActions[goal.id]} className="hover-scale">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Savings Goal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{goal.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>}
              </EnhancedCard>
            </SwipeableCard>;
      })}
      </div>

      {goals.length === 0 && <EnhancedCard className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No savings goals yet</h3>
          <p className="text-muted-foreground mb-6">
            Start by creating your first savings goal to track your progress
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Goal
          </Button>
        </EnhancedCard>}
    </div>;
}