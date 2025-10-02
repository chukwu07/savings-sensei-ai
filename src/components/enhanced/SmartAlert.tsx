import React from 'react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, TrendingUp, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
export type AlertLevel = 'info' | 'warning' | 'urgent' | 'critical' | 'success';
export type AlertType = 'budget' | 'goal' | 'spending' | 'general';
interface SmartAlertProps {
  level: AlertLevel;
  type: AlertType;
  title: string;
  message: string;
  percentage?: number;
  timeContext?: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
  onDismiss?: () => void;
  onSnooze?: () => void;
  className?: string;
}
export function SmartAlert({
  level,
  type,
  title,
  message,
  percentage,
  timeContext,
  actions = [],
  onDismiss,
  onSnooze,
  className
}: SmartAlertProps) {
  const getAlertConfig = () => {
    switch (level) {
      case 'critical':
        return {
          icon: AlertTriangle,
          variant: 'destructive' as const,
          iconColor: 'text-destructive',
          bgClass: 'bg-destructive/5 border-destructive/20',
          pulseClass: 'animate-pulse'
        };
      case 'urgent':
        return {
          icon: AlertCircle,
          variant: 'secondary' as const,
          iconColor: 'text-warning',
          bgClass: 'bg-warning/5 border-warning/20',
          pulseClass: 'animate-gentle-pulse'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          variant: 'secondary' as const,
          iconColor: 'text-warning',
          bgClass: 'bg-warning/5 border-warning/20',
          pulseClass: ''
        };
      case 'success':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          iconColor: 'text-success',
          bgClass: 'bg-success/5 border-success/20',
          pulseClass: ''
        };
      default:
        return {
          icon: Info,
          variant: 'outline' as const,
          iconColor: 'text-info',
          bgClass: 'bg-info/5 border-info/20',
          pulseClass: ''
        };
    }
  };
  const config = getAlertConfig();
  const IconComponent = config.icon;
  const getPercentageColor = () => {
    if (!percentage) return '';
    if (percentage >= 100) return 'text-destructive';
    if (percentage >= 90) return 'text-warning';
    if (percentage >= 75) return 'text-primary';
    return 'text-success';
  };
  return <EnhancedCard className={cn("relative overflow-hidden", config.bgClass, config.pulseClass, className)} variant="glass">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-full", level === 'critical' ? 'bg-destructive/10' : level === 'urgent' ? 'bg-warning/10' : level === 'warning' ? 'bg-warning/10' : level === 'success' ? 'bg-success/10' : 'bg-info/10')}>
              <IconComponent className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-mobile-lg">{title}</h3>
                <Badge variant={config.variant} className="text-xs">
                  {level.toUpperCase()}
                </Badge>
              </div>
              {percentage !== undefined && <div className="flex items-center gap-2">
                  <span className={cn("text-mobile-xl font-bold", getPercentageColor())}>
                    {percentage.toFixed(1)}%
                  </span>
                  {timeContext && <span className="text-mobile-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeContext}
                    </span>}
                </div>}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {onSnooze && <Button size="sm" variant="ghost" onClick={onSnooze} className="h-8 w-8 p-0">
                <Bell className="h-4 w-4" />
              </Button>}
            {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 w-8 p-0">
                ×
              </Button>}
          </div>
        </div>

        {/* Message */}
        <p className="text-mobile-base text-foreground/90 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        {actions.length > 0 && <div className="flex flex-wrap gap-2 pt-2">
            {actions.map((action, index) => <Button key={index} size="sm" variant={action.variant || 'default'} onClick={action.action} className="h-10 px-4 text-mobile-sm font-medium rounded-xl">
                {action.label}
              </Button>)}
          </div>}
      </div>

      {/* Animated border for critical alerts */}
      {level === 'critical' && <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-destructive/20 via-transparent to-destructive/20 animate-pulse" />}
    </EnhancedCard>;
}