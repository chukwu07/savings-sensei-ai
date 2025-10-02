import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cva, type VariantProps } from "class-variance-authority";
import { formatCurrencyShort, getResponsiveFontSize } from "@/utils/formatters";
const enhancedCardVariants = cva("border bg-card text-card-foreground transition-all duration-500", {
  variants: {
    variant: {
      default: "rounded-lg shadow-sm hover:shadow-md",
      primary: "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-lg shadow-primary/10 rounded-lg",
      success: "bg-gradient-to-br from-success/5 to-success/10 border-success/20 shadow-lg shadow-success/10 rounded-lg",
      floating: "shadow-elevated hover:shadow-glow transform hover:scale-[1.02] animate-float rounded-lg",
      glowing: "animate-pulse-glow rounded-lg",
      // Premium Organic Variants
      organic: "rounded-[2rem] shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.1),0_8px_32px_-8px_hsl(var(--primary)/0.15)] hover:shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.15),0_16px_48px_-12px_hsl(var(--primary)/0.2)] backdrop-blur-sm bg-gradient-to-br from-card/95 to-card/85 border-primary/10 hover:scale-[1.01] animate-organic-float",
      premium: "rounded-[2rem] shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.25),0_4px_16px_-4px_hsl(var(--primary)/0.1)] hover:shadow-[0_16px_48px_-12px_hsl(var(--primary)/0.3)] backdrop-blur-md bg-gradient-to-br from-primary/5 via-card/90 to-primary/5 border border-primary/20 hover:border-primary/30 hover:scale-[1.02] animate-gentle-glow",
      glass: "rounded-[2rem] shadow-organic backdrop-blur-lg bg-gradient-organic-glass border-white/20 hover:shadow-organic-hover hover:scale-[1.01]",
      // Page-specific variants with organic styling
      home: "rounded-[1.5rem] bg-gradient-to-br from-home-primary/5 to-home-primary/10 border-home-primary/20 shadow-[0_8px_32px_-8px_hsl(var(--home-primary)/0.15)] hover:shadow-[0_12px_40px_-8px_hsl(var(--home-primary)/0.2)] hover:scale-[1.01]",
      budget: "rounded-[1.5rem] bg-gradient-to-br from-budget-primary/5 to-budget-primary/10 border-budget-primary/20 shadow-[0_8px_32px_-8px_hsl(var(--budget-primary)/0.15)] hover:shadow-[0_12px_40px_-8px_hsl(var(--budget-primary)/0.2)] hover:scale-[1.01]",
      goals: "rounded-[1.5rem] bg-gradient-to-br from-goals-primary/5 to-goals-primary/10 border-goals-primary/20 shadow-[0_8px_32px_-8px_hsl(var(--goals-primary)/0.15)] hover:shadow-[0_12px_40px_-8px_hsl(var(--goals-primary)/0.2)] hover:scale-[1.01]",
      settings: "rounded-[1.5rem] bg-gradient-to-br from-settings-primary/5 to-settings-primary/10 border-settings-primary/20 shadow-[0_8px_32px_-8px_hsl(var(--settings-primary)/0.15)] hover:shadow-[0_12px_40px_-8px_hsl(var(--settings-primary)/0.2)] hover:scale-[1.01]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
export interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof enhancedCardVariants> {
  title?: string;
  description?: string;
  value?: string | number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  // New layout props for modern card design
  layout?: "horizontal" | "vertical";
  showShortNumbers?: boolean;
}
const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(({
  className,
  variant,
  title,
  description,
  value,
  trend,
  icon,
  layout = "horizontal",
  showShortNumbers = false,
  children,
  ...props
}, ref) => {
  const {
    formatCurrency
  } = useCurrency();
  // Format value based on showShortNumbers prop
  const formattedValue = value ? typeof value === 'number' ? showShortNumbers ? formatCurrencyShort(value) : formatCurrency(value) : value : null;

  // Get responsive font size for the value
  const valueFontSize = formattedValue ? getResponsiveFontSize(formattedValue) : 'text-mobile-xl';

  // Vertical layout for modern card design
  if (layout === "vertical") {
    return <Card ref={ref} className={cn(enhancedCardVariants({
      variant
    }), "relative overflow-hidden rounded-xl shadow-card hover:shadow-elevated transition-all duration-300", className)} {...props}>
        <CardContent className="p-6 text-center space-y-4">
          {/* Icon at top */}
          {icon && <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                {icon}
              </div>
            </div>}
          
          {/* Value in middle - bold, responsive size */}
          {formattedValue && <div className="space-y-1">
              <div className={cn(valueFontSize, "font-bold text-foreground leading-tight truncate")}>
                {formattedValue}
              </div>
              {trend && <div className="flex justify-center">
                  <span className={cn("text-mobile-sm font-medium flex items-center", trend === "up" && "text-success", trend === "down" && "text-destructive", trend === "neutral" && "text-muted-foreground")}>
                    {trend === "up" && "↗"}
                    {trend === "down" && "↘"}
                    {trend === "neutral" && "→"}
                  </span>
                </div>}
            </div>}
          
          {/* Label at bottom */}
          {title && <div className="space-y-1">
              <h3 className="text-mobile-sm font-medium text-muted-foreground truncate leading-tight">
                {title}
              </h3>
              {description && <p className="text-mobile-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
                  {description}
                </p>}
            </div>}
          
          {/* Additional content */}
          {children && <div className="overflow-hidden">
              {children}
            </div>}
        </CardContent>
      </Card>;
  }

  // Horizontal layout (existing design)
  return <Card ref={ref} className={cn(enhancedCardVariants({
    variant
  }), "relative overflow-hidden rounded-xl shadow-card hover:shadow-elevated transition-all duration-300", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 overflow-hidden">
        <div className="space-y-1 flex-1 min-w-0">
          {title && <CardTitle className="text-mobile-base font-semibold tracking-tight leading-tight truncate">
              {title}
            </CardTitle>}
          {description && <CardDescription className="text-mobile-sm break-words leading-relaxed line-clamp-2">
              {description}
            </CardDescription>}
        </div>
        {icon}
      </CardHeader>
      <CardContent className="pt-0 overflow-hidden">
        {formattedValue && <div className="flex items-baseline space-x-2 min-w-0 overflow-hidden">
            <div className={cn(valueFontSize, "font-bold truncate flex-1 min-w-0")}>
              {formattedValue}
            </div>
            {trend && <span className={cn("text-mobile-sm font-medium flex items-center flex-shrink-0", trend === "up" && "text-success", trend === "down" && "text-destructive", trend === "neutral" && "text-muted-foreground")}>
                {trend === "up" && "↗"}
                {trend === "down" && "↘"}
                {trend === "neutral" && "→"}
              </span>}
          </div>}
        <div className="overflow-hidden">
          {children}
        </div>
      </CardContent>
    </Card>;
});
EnhancedCard.displayName = "EnhancedCard";
export { EnhancedCard, enhancedCardVariants };