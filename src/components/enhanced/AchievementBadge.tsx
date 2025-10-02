import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Target, Zap, Crown, Medal, Award, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
export type AchievementType = 'first-goal' | 'consistent-saver' | 'budget-master' | 'goal-crusher' | 'streak-hero' | 'spending-sage' | 'milestone-achiever' | 'financial-ninja';
interface AchievementBadgeProps {
  type: AchievementType;
  earned: boolean;
  progress?: number;
  className?: string;
  showAnimation?: boolean;
}
export function AchievementBadge({
  type,
  earned,
  progress = 0,
  className,
  showAnimation = true
}: AchievementBadgeProps) {
  const getAchievementConfig = () => {
    switch (type) {
      case 'first-goal':
        return {
          icon: Target,
          title: 'Goal Setter',
          description: 'Created your first savings goal',
          color: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'consistent-saver':
        return {
          icon: Trophy,
          title: 'Consistent Saver',
          description: '7 days of consistent saving',
          color: 'bg-success/10 text-success border-success/20'
        };
      case 'budget-master':
        return {
          icon: Crown,
          title: 'Budget Master',
          description: 'Stayed under budget for 30 days',
          color: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'goal-crusher':
        return {
          icon: Award,
          title: 'Goal Crusher',
          description: 'Completed 3 savings goals',
          color: 'bg-goals-primary/10 text-goals-primary border-goals-primary/20'
        };
      case 'streak-hero':
        return {
          icon: Zap,
          title: 'Streak Hero',
          description: '30-day spending tracking streak',
          color: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      case 'spending-sage':
        return {
          icon: Sparkles,
          title: 'Spending Sage',
          description: 'Made 10 smart spending decisions',
          color: 'bg-info/10 text-info border-info/20'
        };
      case 'milestone-achiever':
        return {
          icon: Medal,
          title: 'Milestone Achiever',
          description: 'Reached 5 goal milestones',
          color: 'bg-accent/10 text-accent border-accent/20'
        };
      case 'financial-ninja':
        return {
          icon: Star,
          title: 'Financial Ninja',
          description: 'Master of personal finance',
          color: 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20'
        };
    }
  };
  const config = getAchievementConfig();
  const IconComponent = config.icon;
  return <div className={cn("relative group", className)}>
      

      {/* Celebration animation for newly earned badges */}
      {earned && showAnimation && <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
          <div className="absolute -top-2 -right-2 w-5 h-5 border-2 border-primary/30 rounded-full animate-pulse" />
        </div>}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-card border border-border rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
        <div className="font-medium">{config.title}</div>
        <div className="text-muted-foreground">{config.description}</div>
        {!earned && progress > 0 && <div className="text-primary">Progress: {Math.round(progress)}%</div>}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-card" />
      </div>
    </div>;
}