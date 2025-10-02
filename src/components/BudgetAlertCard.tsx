import { AlertTriangle } from "lucide-react";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { formatCurrencyShort } from "@/utils/formatters";

export function BudgetAlertCard() {
  const { formatCurrency } = useCurrency();
  const { alerts } = useSmartAlerts();

  // Filter for budget alerts only
  const budgetAlerts = alerts.filter(alert => alert.type === 'budget');
  
  if (budgetAlerts.length === 0) {
    return null;
  }

  // Get the most critical alert
  const criticalAlert = budgetAlerts.find(alert => alert.level === 'critical') || budgetAlerts[0];
  
  // Determine severity styling
  const getSeverityStyles = (level: string, percentage?: number) => {
    if (level === 'critical' || (percentage && percentage >= 100)) {
      return {
        bgClass: "bg-destructive/10 border-destructive/30 hover:bg-destructive/15",
        iconClass: "text-destructive",
        textClass: "text-black",
        amountClass: "text-black font-bold"
      };
    }
    
    if (level === 'warning' || (percentage && percentage >= 90)) {
      return {
        bgClass: "bg-warning/10 border-warning/30 hover:bg-warning/15", 
        iconClass: "text-warning",
        textClass: "text-warning-foreground",
        amountClass: "text-warning font-bold"
      };
    }

    // Near limit (amber)
    return {
      bgClass: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15",
      iconClass: "text-amber-500", 
      textClass: "text-amber-700 dark:text-amber-300",
      amountClass: "text-amber-600 dark:text-amber-400 font-bold"
    };
  };

  const styles = getSeverityStyles(criticalAlert.level, criticalAlert.percentage);

  return (
    <div className="animate-fade-in animate-slide-in-right">
      <EnhancedCard 
        className={cn(
          "transition-all duration-500 hover:scale-[1.02] animate-gentle-glow",
          styles.bgClass
        )}
      >
        <div className="p-4 space-y-3">
          {/* Header with Icon and Title */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className={cn("h-5 w-5", styles.iconClass)} />
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className={cn("font-semibold text-mobile-base leading-tight", styles.textClass)}>
                {criticalAlert.title}
              </h3>
              
              {/* Alert Message */}
              <p className={cn(
                "text-mobile-sm leading-relaxed break-words",
                styles.textClass,
                "opacity-90"
              )}>
                {criticalAlert.message}
              </p>

              {/* Budget Details */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {criticalAlert.percentage && (
                  <Badge 
                    variant={criticalAlert.level === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs font-medium"
                  >
                    {Math.round(criticalAlert.percentage)}% Used
                  </Badge>
                )}
                
                {/* Amount spent - auto-resize with formatCurrencyShort */}
                <span className={cn(
                  "text-mobile-sm font-medium truncate",
                  styles.amountClass
                )}>
                  {criticalAlert.message?.includes('£') 
                    ? criticalAlert.message.match(/£[\d,]+/)?.[0] || ''
                    : ''
                  }
                </span>
              </div>

              {/* Time Context */}
              {criticalAlert.timeContext && (
                <p className={cn(
                  "text-mobile-xs opacity-75 leading-tight",
                  styles.textClass
                )}>
                  {criticalAlert.timeContext}
                </p>
              )}
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}