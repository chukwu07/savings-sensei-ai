import React from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  showMilestones?: boolean;
  animated?: boolean;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  variant = 'default',
  showMilestones = true,
  animated = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          track: 'stroke-success/20',
          progress: 'stroke-success',
          glow: 'drop-shadow-[0_0_8px_hsl(var(--success)/0.5)]'
        };
      case 'warning':
        return {
          track: 'stroke-warning/20',
          progress: 'stroke-warning',
          glow: 'drop-shadow-[0_0_8px_hsl(var(--warning)/0.5)]'
        };
      case 'destructive':
        return {
          track: 'stroke-destructive/20',
          progress: 'stroke-destructive',
          glow: 'drop-shadow-[0_0_8px_hsl(var(--destructive)/0.5)]'
        };
      default:
        return {
          track: 'stroke-primary/20',
          progress: 'stroke-primary',
          glow: 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
        };
    }
  };

  const colors = getVariantColors();
  const milestones = [25, 50, 75, 100];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn("transform -rotate-90", animated && "transition-all duration-1000 ease-out")}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn(colors.progress, colors.glow)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: animated ? 'stroke-dashoffset 1s ease-out, filter 0.3s ease' : undefined,
          }}
        />

        {/* Milestone markers */}
        {showMilestones && milestones.map((milestone) => {
          const angle = (milestone / 100) * 360 - 90;
          const x = size / 2 + (radius - strokeWidth / 2) * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + (radius - strokeWidth / 2) * Math.sin((angle * Math.PI) / 180);
          
          return (
            <circle
              key={milestone}
              cx={x}
              cy={y}
              r={strokeWidth / 4}
              className={cn(
                value >= milestone ? colors.progress : 'fill-muted',
                "transition-colors duration-500"
              )}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}