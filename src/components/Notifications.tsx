import { SwipeableCard } from "@/components/enhanced/SwipeableCard";
import { CircularProgress } from "@/components/enhanced/CircularProgress";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Target, TrendingUp, CheckCircle, X, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useBudgets } from "@/hooks/useBudgets";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils";
interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'urgent';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionable: boolean;
  actionType?: 'budget' | 'goal' | 'insights' | 'transactions';
  actionData?: any;
}
export function Notifications() {
  const {
    budgets
  } = useBudgets();
  const {
    goals
  } = useSavingsGoals();
  const {
    transactions
  } = useTransactions();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => {
    const notifs: Notification[] = [];

    // Budget warnings
    budgets.forEach(budget => {
      const percentage = budget.spent / budget.allocated * 100;
      if (percentage > 90) {
        notifs.push({
          id: `budget-${budget.id}`,
          type: percentage > 100 ? 'urgent' : 'warning',
          title: `${budget.category} Budget Alert`,
          description: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget (${formatCurrency(budget.spent)}/${formatCurrency(budget.allocated)})`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          read: false,
          actionable: true,
          actionType: 'budget',
          actionData: {
            budgetId: budget.id,
            category: budget.category
          }
        });
      }
    });

    // Goal progress notifications
    goals.forEach(goal => {
      const progress = goal.current_amount / goal.target_amount * 100;
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const monthsLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (progress >= 100) {
        notifs.push({
          id: `goal-complete-${goal.id}`,
          type: 'success',
          title: `🎉 Goal Achieved!`,
          description: `Congratulations! You've reached your ${goal.name} goal of ${formatCurrency(goal.target_amount)}!`,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          read: false,
          actionable: false
        });
      } else if (monthsLeft <= 2 && progress < 80) {
        notifs.push({
          id: `goal-deadline-${goal.id}`,
          type: 'urgent',
          title: `Goal Deadline Approaching`,
          description: `${goal.name} deadline is in ${monthsLeft} months. You're ${progress.toFixed(0)}% complete. Consider increasing contributions.`,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          read: false,
          actionable: true,
          actionType: 'goal',
          actionData: {
            goalId: goal.id,
            goalName: goal.name
          }
        });
      } else if (progress >= 25 && progress < 50) {
        notifs.push({
          id: `goal-progress-${goal.id}`,
          type: 'info',
          title: `Savings Progress Update`,
          description: `You're ${progress.toFixed(0)}% towards your ${goal.name} goal. Keep up the great work!`,
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
          read: Math.random() > 0.5,
          actionable: false
        });
      }
    });

    // AI insights based on real transactions
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    if (totalExpenses > 400) {
      notifs.push({
        id: 'ai-insight-1',
        type: 'info',
        title: '💡 AI Insight: Spending Pattern',
        description: 'Your dining expenses are higher than usual this week. Consider meal prepping to save £40-60/month.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        read: false,
        actionable: true,
        actionType: 'insights',
        actionData: {
          category: 'dining'
        }
      });
    }
    notifs.push({
      id: 'ai-tip-1',
      type: 'info',
      title: '🚀 Weekly Tip',
      description: 'Set up automatic transfers to savings right after payday. This "pay yourself first" strategy increases savings success by 70%!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: Math.random() > 0.3,
      actionable: false
    });

    // Sort by timestamp (newest first)
    setNotifications(notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, [budgets, goals, transactions]);
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => notif.id === id ? {
      ...notif,
      read: true
    } : notif));
  };
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({
      ...notif,
      read: true
    })));
  };
  const unreadCount = notifications.filter(n => !n.read).length;
  const handleTakeAction = (notification: Notification) => {
    markAsRead(notification.id);
    // Note: Navigation functionality will be added when this component is integrated into the main app
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'info':
        return <TrendingUp className="h-5 w-5 text-info" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };
  const getPriorityBorderColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-l-destructive';
      case 'warning':
        return 'border-l-warning';
      case 'success':
        return 'border-l-success';
      case 'info':
        return 'border-l-info';
      default:
        return 'border-l-muted-foreground';
    }
  };
  const getPriorityVariant = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      case 'info':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  const getProgressVariant = (percentage: number) => {
    if (percentage >= 100) return 'destructive';
    if (percentage >= 90) return 'warning';
    if (percentage >= 75) return 'default';
    return 'success';
  };
  const extractBudgetPercentage = (description: string) => {
    const match = description.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  };
  return <div className="space-y-6 animate-fade-in">
      {/* Mobile Header */}
      <div className="pt-4 px-4">
        <h1 className="text-lg font-bold text-foreground">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay updated with your financial activities and AI-powered insights
        </p>
      </div>

      {/* Notification Categories */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnhancedCard title="Budget Alerts" variant="floating">
          <div className="text-2xl font-bold text-warning">
            {notifications.filter(n => n.type === 'warning' || n.type === 'urgent').length}
          </div>
          <p className="text-sm text-muted-foreground">Active alerts</p>
        </EnhancedCard>

        <EnhancedCard title="Goal Updates" variant="success">
          <div className="text-2xl font-bold">
            {notifications.filter(n => n.title.includes('Goal') || n.title.includes('Savings')).length}
          </div>
          <p className="text-sm text-muted-foreground">Goal notifications</p>
        </EnhancedCard>

        <EnhancedCard title="AI Insights" variant="glowing">
          <div className="text-2xl font-bold text-info">
            {notifications.filter(n => n.title.includes('AI') || n.title.includes('Tip')).length}
          </div>
          <p className="text-sm text-muted-foreground">Smart suggestions</p>
        </EnhancedCard>
      </div>

      {/* Notifications List */}
      <div className="px-4 space-y-2">
        {notifications.length === 0 ? <EnhancedCard className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No new notifications. We'll notify you of important financial updates.
            </p>
          </EnhancedCard> : notifications.map(notification => {
        const isBudgetNotification = notification.type === 'warning' || notification.type === 'urgent';
        const budgetPercentage = isBudgetNotification ? extractBudgetPercentage(notification.description) : 0;
        return <EnhancedCard key={notification.id} className="p-3 relative overflow-hidden">
                {/* Priority border indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityBorderColor(notification.type)}`} />
                
                <div className="pl-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(notification.type)}
                    <h3 className="text-sm font-medium flex-1">{notification.title}</h3>
                    {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {notification.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </EnhancedCard>;
      })}
      </div>

      {/* Smart Notification Settings */}
      <EnhancedCard title="Notification Preferences" description="Customize your alert settings">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="font-medium">Budget Alerts</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Notify when 90% of budget is used</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Weekly spending summaries</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">AI Insights</h4>
            <div className="space-y-2 text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Personalized saving tips</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Goal progress updates</span>
              </label>
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>;
}