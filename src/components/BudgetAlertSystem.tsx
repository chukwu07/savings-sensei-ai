import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { SmartAlert } from "@/components/enhanced/SmartAlert";
import { Mail, Send, Settings, CheckCircle, AlertTriangle, TrendingUp, Clock, Zap, Target, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { useBudgets } from "@/hooks/useBudgets";
import { cn } from "@/lib/utils";

export function BudgetAlertSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { budgets, updateBudget } = useBudgets();
  const { alerts, criticalAlerts, realTimeMonitoring, dismissAlert, snoozeAlert, toggleRealTimeMonitoring } = useSmartAlerts();
  const [isSending, setIsSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [selectedThreshold, setSelectedThreshold] = useState(80);

  const handleSendBudgetAlerts = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send budget alerts.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-budget-alerts', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setLastSentAt(new Date());
      toast({
        title: "Budget Alerts Sent! ✅",
        description: `Successfully sent ${data.alertsSent || 0} budget alert(s) to users who need them.`,
      });
    } catch (error) {
      console.error('Error sending budget alerts:', error);
      toast({
        title: "Failed to Send Alerts",
        description: "There was an error sending budget alerts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const thresholdOptions = [
    { value: 75, label: '75% Warning', color: 'text-info', bg: 'bg-info/10' },
    { value: 80, label: '80% Alert', color: 'text-warning', bg: 'bg-warning/10' },
    { value: 90, label: '90% Urgent', color: 'text-destructive', bg: 'bg-destructive/10' },
    { value: 100, label: '100% Critical', color: 'text-destructive', bg: 'bg-destructive/20' }
  ];

  const activeBudgetAlerts = alerts.filter(alert => alert.type === 'budget');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-mobile-2xl font-bold gradient-text flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            Smart Budget Alerts
          </h1>
          <div className="flex items-center gap-3">
            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-full">
                <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">{criticalAlerts.length} Critical</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleRealTimeMonitoring}
              className="flex items-center gap-2"
            >
              {realTimeMonitoring ? (
                <>
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Live Monitoring</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Monitoring Off</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-mobile-base">
          AI-powered budget monitoring with multi-level alerts and smart recommendations
        </p>
      </div>

      {/* Live Alerts Section */}
      {activeBudgetAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-mobile-lg font-semibold">Active Budget Alerts</h2>
          </div>
          <div className="space-y-3">
            {activeBudgetAlerts.slice(0, 3).map((alert) => (
              <SmartAlert
                key={alert.id}
                level={alert.level}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                percentage={alert.percentage}
                timeContext={alert.timeContext}
                onDismiss={() => dismissAlert(alert.id)}
                onSnooze={() => snoozeAlert(alert.id, 24)}
                actions={[
                  {
                    label: 'Adjust Budget',
                    action: () => {
                      const budgetId = alert.id.replace('budget-', '');
                      const budget = budgets.find(b => b.id === budgetId);
                      if (budget && alert.percentage && alert.percentage > 100) {
                        const newAmount = Math.ceil(budget.spent * 1.1);
                        updateBudget(budgetId, { allocated: newAmount });
                        toast({
                          title: 'Budget Updated',
                          description: `Increased ${budget.category} budget to £${newAmount}`,
                        });
                      }
                    },
                    variant: 'outline' as const
                  },
                  {
                    label: 'AI Insight',
                    action: () => {
                      const budgetId = alert.id.replace('budget-', '');
                      const budget = budgets.find(b => b.id === budgetId);
                      if (budget && 'aiRecommendation' in alert && alert.aiRecommendation) {
                        toast({
                          title: '🤖 AI Recommendation',
                          description: alert.aiRecommendation,
                        });
                      }
                    },
                    variant: 'outline' as const
                  }
                ]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Alert Configuration */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Threshold Settings */}
        <EnhancedCard variant="glass" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-warning to-warning/70 rounded-xl">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-mobile-lg">Alert Thresholds</h3>
                <p className="text-mobile-sm text-muted-foreground">
                  Configure when alerts should trigger
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {thresholdOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setSelectedThreshold(option.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    selectedThreshold === option.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", option.bg)} />
                      <span className={cn("font-medium", option.color)}>{option.label}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      selectedThreshold === option.value
                        ? "border-primary bg-primary"
                        : "border-border"
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </EnhancedCard>

        {/* Manual Alert Trigger */}
        <EnhancedCard variant="glass" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-xl">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-mobile-lg">Email Alerts</h3>
                <p className="text-mobile-sm text-muted-foreground">
                  Send notifications to users exceeding limits
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {lastSentAt && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-mobile-sm font-medium text-success">Alerts sent successfully</p>
                      <p className="text-mobile-xs text-success/80">
                        {lastSentAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleSendBudgetAlerts}
                  disabled={isSending}
                  className="h-12 text-mobile-base font-medium"
                  size="lg"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Budget Alerts...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Budget Alerts ({selectedThreshold}%+)
                    </>
                  )}
                </Button>
                
                <p className="text-mobile-xs text-muted-foreground text-center">
                  Will notify users who exceeded {selectedThreshold}% of their budget
                </p>
              </div>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Smart Features Overview */}
      <EnhancedCard variant="glass" className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-mobile-xl font-bold gradient-text">Enhanced Alert Intelligence</h3>
            <p className="text-muted-foreground text-mobile-base">
              AI-powered monitoring with predictive insights and smart recommendations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-3 p-4 bg-background/50 rounded-xl border border-border/50">
              <div className="p-3 bg-gradient-to-br from-info to-info/70 rounded-xl w-fit mx-auto">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-mobile-base">Predictive Analysis</h4>
                <p className="text-mobile-sm text-muted-foreground">
                  Forecasts spending patterns and budget overruns before they happen
                </p>
              </div>
            </div>

            <div className="text-center space-y-3 p-4 bg-background/50 rounded-xl border border-border/50">
              <div className="p-3 bg-gradient-to-br from-warning to-warning/70 rounded-xl w-fit mx-auto">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-mobile-base">Smart Timing</h4>
                <p className="text-mobile-sm text-muted-foreground">
                  Contextual alerts based on days remaining and spending velocity
                </p>
              </div>
            </div>

            <div className="text-center space-y-3 p-4 bg-background/50 rounded-xl border border-border/50">
              <div className="p-3 bg-gradient-to-br from-success to-success/70 rounded-xl w-fit mx-auto">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-mobile-base">Quick Actions</h4>
                <p className="text-mobile-sm text-muted-foreground">
                  One-tap budget adjustments and spending limit modifications
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="font-medium text-primary text-mobile-base">Multi-Level Alert System</h4>
                <p className="text-mobile-sm text-muted-foreground">
                  Progressive alerts at 75% (Warning), 80% (Alert), 90% (Urgent), and 100% (Critical) thresholds 
                  with intelligent recommendations and contextual timing based on spending patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}