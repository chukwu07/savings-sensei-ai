import { useState, useEffect } from 'react';
import { AlertLevel, AlertType } from '@/components/enhanced/SmartAlert';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useToast } from '@/hooks/use-toast';

interface SmartAlert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  title: string;
  message: string;
  percentage?: number;
  timeContext?: string;
  timestamp: Date;
  dismissed: boolean;
  snoozedUntil?: Date;
  priority: number; // 1-5, 5 being highest
  aiRecommendation?: string;
  actionable: boolean;
}

export function useSmartAlerts() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(true);
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useSavingsGoals();
  const { toast } = useToast();

  const generateAIRecommendation = (alert: Partial<SmartAlert>, budget?: any): string => {
    if (alert.type === 'budget' && budget) {
      const percentage = alert.percentage || 0;
      const daysInMonth = 30;
      const currentDay = new Date().getDate();
      const daysRemaining = daysInMonth - currentDay;
      
      if (percentage >= 110) {
        return `Consider creating a separate emergency fund or temporarily switching to cash-only spending for ${budget.category}.`;
      } else if (percentage >= 100) {
        return `You have ${daysRemaining} days left. Try the 50/30/20 rule: pause non-essential ${budget.category} purchases.`;
      } else if (percentage >= 90) {
        const dailyLimit = (budget.allocated - budget.spent) / daysRemaining;
        return `Daily spending limit: £${dailyLimit.toFixed(2)} for ${budget.category}. Set a phone reminder!`;
      } else if (percentage >= 75) {
        return `You're on track but trending high. Consider reviewing subscriptions and recurring ${budget.category} expenses.`;
      }
    }
    return 'Monitor your spending patterns and adjust as needed.';
  };

  const getPriority = (level: AlertLevel, percentage?: number): number => {
    if (level === 'critical') return 5;
    if (level === 'urgent') return 4;
    if (level === 'warning') return 3;
    if (level === 'info') return 2;
    if (level === 'success') return 1;
    return 1;
  };

  const generateBudgetAlerts = () => {
    const newAlerts: SmartAlert[] = [];

    budgets.forEach(budget => {
      const percentage = (budget.spent / budget.allocated) * 100;
      const remaining = budget.allocated - budget.spent;
      
      // Calculate days remaining in period
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const daysRemaining = daysInMonth - currentDay;

      let alert: Partial<SmartAlert> | null = null;

      if (percentage >= 110) {
        alert = {
          level: 'critical',
          title: `🚨 ${budget.category} Budget Crisis!`,
          message: `You're ${((budget.spent - budget.allocated) / budget.allocated * 100).toFixed(1)}% over budget. Immediate action required!`,
          percentage,
          timeContext: `${daysRemaining} days left in period`,
          priority: 5,
          actionable: true
        };
      } else if (percentage >= 100) {
        alert = {
          level: 'urgent',
          title: `⚠️ ${budget.category} Budget Maxed Out`,
          message: `Budget fully used with ${daysRemaining} days remaining. Switch to emergency mode.`,
          percentage,
          timeContext: `${daysRemaining} days left in period`,
          priority: 4,
          actionable: true
        };
      } else if (percentage >= 90) {
        alert = {
          level: 'warning',
          title: `⏰ ${budget.category} Budget Alert`,
          message: `90% used! Only £${remaining.toFixed(2)} left for ${daysRemaining} days.`,
          percentage,
          timeContext: `£${(remaining / daysRemaining).toFixed(2)} daily limit`,
          priority: 3,
          actionable: true
        };
      } else if (percentage >= 75) {
        // Enhanced velocity calculation
        const dailySpent = budget.spent / currentDay;
        const projectedSpent = dailySpent * daysInMonth;
        const projectedPercentage = (projectedSpent / budget.allocated) * 100;

        if (projectedPercentage > 100) {
          alert = {
            level: 'warning',
            title: `📈 ${budget.category} Overspend Risk`,
            message: `Current pace will exceed budget by ${(projectedPercentage - 100).toFixed(1)}% this month.`,
            percentage: projectedPercentage,
            timeContext: `Based on £${dailySpent.toFixed(2)}/day average`,
            priority: 3,
            actionable: true
          };
        }
      }

      if (alert) {
        const fullAlert = {
          id: `budget-${budget.id}`,
          type: 'budget' as AlertType,
          timestamp: new Date(),
          dismissed: false,
          aiRecommendation: generateAIRecommendation(alert, budget),
          actionable: true,
          priority: getPriority(alert.level, alert.percentage),
          ...alert
        } as SmartAlert;

        newAlerts.push(fullAlert);

        // Real-time toast for critical alerts
        if (realTimeMonitoring && alert.level === 'critical' && !alerts.find(a => a.id === fullAlert.id)) {
          toast({
            title: alert.title,
            description: alert.message,
            variant: "destructive",
          });
        }
      }
    });

    return newAlerts;
  };

  const generateGoalAlerts = () => {
    const newAlerts: SmartAlert[] = [];

    goals.forEach(goal => {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      const remaining = goal.target_amount - goal.current_amount;
      
      // Calculate time to deadline
      const deadline = new Date(goal.deadline);
      const today = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.ceil(daysRemaining / 30);

      let alert: Partial<SmartAlert> | null = null;

      if (progress >= 100) {
        alert = {
          level: 'success',
          title: `🎉 Goal Achieved: ${goal.name}`,
          message: `Congratulations! You've reached your savings goal. Time to celebrate and set a new challenge!`,
          percentage: progress,
          priority: 2,
          actionable: false
        };
      } else if (daysRemaining <= 30 && progress < 90) {
        const monthlyNeeded = remaining / Math.max(1, monthsRemaining);
        alert = {
          level: 'urgent',
          title: `🏁 Final Sprint: ${goal.name}`,
          message: `Deadline in ${daysRemaining} days! You need £${monthlyNeeded.toFixed(0)}/month to succeed.`,
          percentage: progress,
          timeContext: `${daysRemaining} days remaining`,
          priority: 4,
          actionable: true
        };
      } else if (progress >= 75) {
        alert = {
          level: 'info',
          title: `⭐ Excellent Progress: ${goal.name}`,
          message: `You're ${progress.toFixed(1)}% complete! Your consistency is paying off beautifully.`,
          percentage: progress,
          timeContext: `${monthsRemaining} months remaining`,
          priority: 2,
          actionable: false
        };
      }

      if (alert) {
        newAlerts.push({
          id: `goal-${goal.id}`,
          type: 'goal' as AlertType,
          timestamp: new Date(),
          dismissed: false,
          aiRecommendation: generateAIRecommendation(alert),
          actionable: alert.actionable || false,
          priority: getPriority(alert.level, alert.percentage),
          ...alert
        } as SmartAlert);
      }
    });

    return newAlerts;
  };

  const generateSpendingAlerts = () => {
    const newAlerts: SmartAlert[] = [];
    
    // Analyze recent spending patterns
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= lastWeek && t.type === 'expense'
    );

    const weeklySpending = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const dailyAverage = weeklySpending / 7;

    // Compare to previous week
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= twoWeeksAgo && date < lastWeek && t.type === 'expense';
    });
    const previousWeekSpending = previousWeekTransactions.reduce((sum, t) => sum + t.amount, 0);

    if (previousWeekSpending > 0) {
      const changePercentage = ((weeklySpending - previousWeekSpending) / previousWeekSpending) * 100;

    if (changePercentage > 25) {
      newAlerts.push({
        id: 'spending-increase',
        type: 'spending' as AlertType,
        level: 'warning',
        title: '📊 Spending Spike Detected',
        message: `Spending up ${changePercentage.toFixed(1)}% vs last week (£${weeklySpending.toFixed(2)} vs £${previousWeekSpending.toFixed(2)}).`,
        timeContext: `Daily average: £${dailyAverage.toFixed(2)}`,
        timestamp: new Date(),
        dismissed: false,
        priority: 3,
        actionable: true,
        aiRecommendation: 'Review recent purchases and identify any unusual spending patterns. Consider using the 24-hour rule for non-essential purchases.'
      });
    }
    }

    // Unusual category spending
    const categorySpending = recentTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categorySpending).forEach(([category, amount]) => {
      const budget = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
      if (budget) {
        const weeklyBudget = budget.allocated / 4; // Approximate weekly budget
        if (amount > weeklyBudget * 1.5) {
          newAlerts.push({
            id: `category-${category}`,
            type: 'spending' as AlertType,
            level: 'info',
            title: `💳 High ${category} Activity`,
            message: `£${amount.toFixed(2)} spent on ${category} this week (${((amount / weeklyBudget) * 100).toFixed(0)}% of weekly budget).`,
            timeContext: `Weekly budget: £${weeklyBudget.toFixed(2)}`,
            timestamp: new Date(),
            dismissed: false,
            priority: 2,
            actionable: true,
            aiRecommendation: `Review ${category} purchases and consider if this spending aligns with your priorities. Look for subscription duplicates or impulse purchases.`
          });
        }
      }
    });

    return newAlerts;
  };

  const updateAlerts = () => {
    const budgetAlerts = generateBudgetAlerts();
    const goalAlerts = generateGoalAlerts();
    const spendingAlerts = generateSpendingAlerts();

    const allNewAlerts = [...budgetAlerts, ...goalAlerts, ...spendingAlerts];

    // Sort by priority and timestamp
    allNewAlerts.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    setAlerts(prev => {
      // Keep dismissed and snoozed alerts, add new ones
      const existingDismissed = prev.filter(a => a.dismissed);
      const existingSnoozed = prev.filter(a => 
        a.snoozedUntil && new Date(a.snoozedUntil) > new Date()
      );

      // Remove old alerts of the same type and add new ones
      const filteredNew = allNewAlerts.filter(newAlert => 
        !existingDismissed.some(existing => existing.id === newAlert.id) &&
        !existingSnoozed.some(existing => existing.id === newAlert.id)
      );

      return [...existingDismissed, ...existingSnoozed, ...filteredNew];
    });
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, dismissed: true } : alert
    ));
  };

  const snoozeAlert = (id: string, hours: number = 24) => {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, snoozedUntil } : alert
    ));
  };

  const toggleRealTimeMonitoring = () => {
    setRealTimeMonitoring(prev => !prev);
    toast({
      title: realTimeMonitoring ? "Real-time Monitoring Disabled" : "Real-time Monitoring Enabled",
      description: realTimeMonitoring ? "You'll no longer receive instant notifications" : "You'll now receive instant notifications for critical alerts",
    });
  };

  const getActiveAlerts = () => {
    const now = new Date();
    return alerts.filter(alert => 
      !alert.dismissed && 
      (!alert.snoozedUntil || new Date(alert.snoozedUntil) <= now)
    );
  };

  const getCriticalAlerts = () => {
    return getActiveAlerts().filter(alert => 
      alert.level === 'critical' || alert.level === 'urgent'
    );
  };

  useEffect(() => {
    updateAlerts();
  }, [transactions, budgets, goals]);

  return {
    alerts: getActiveAlerts(),
    criticalAlerts: getCriticalAlerts(),
    realTimeMonitoring,
    dismissAlert,
    snoozeAlert,
    updateAlerts,
    toggleRealTimeMonitoring
  };
}
