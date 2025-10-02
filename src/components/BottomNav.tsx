import { cn } from "@/lib/utils";
import { 
  Home, 
  Target, 
  PiggyBank, 
  Settings,
  Wallet
} from "lucide-react";

export type TabType = 'home' | 'budget' | 'goals' | 'moneyhub' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems = [
  { id: 'home' as TabType, label: 'Home', icon: Home, glowColor: 'shadow-home-primary/20' },
  { id: 'budget' as TabType, label: 'Budget', icon: PiggyBank, glowColor: 'shadow-budget-primary/20' },
  { id: 'goals' as TabType, label: 'Goals', icon: Target, glowColor: 'shadow-goals-primary/20' },
  { id: 'moneyhub' as TabType, label: 'Money Hub', icon: Wallet, glowColor: 'shadow-primary/20' },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings, glowColor: 'shadow-settings-primary/20' }
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/50">
      <div className="safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 h-12 px-3 rounded-xl min-w-0 flex-1 transition-all duration-300 ease-out",
                  isActive 
                    ? cn(
                        // Base active styles with page-specific colors
                        `text-${item.id}-primary bg-${item.id}-primary/10`,
                        // Glow effects - multiple shadow layers
                        `shadow-lg shadow-${item.id}-primary/20`,
                        `before:absolute before:inset-0 before:rounded-xl before:bg-${item.id}-primary/5`,
                        `before:animate-gentle-pulse before:transition-all before:duration-300`,
                        // Smooth animation on activation
                        "animate-tab-smooth-in",
                        // Enhanced shadow for depth
                        "shadow-2xl"
                      )
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-105 transition-transform duration-200"
                )}
                style={isActive ? {
                  filter: `drop-shadow(0 0 8px hsl(var(--${item.id}-primary) / 0.3)) drop-shadow(0 0 16px hsl(var(--${item.id}-primary) / 0.1))`,
                  boxShadow: `0 0 20px hsl(var(--${item.id}-primary) / 0.15), 0 0 40px hsl(var(--${item.id}-primary) / 0.05), inset 0 1px 0 hsl(var(--${item.id}-primary) / 0.1)`
                } : {}}
              >
                {/* Glow background layer */}
                {isActive && (
                  <div 
                      className={cn(
                        "absolute inset-0 rounded-xl transition-all duration-300 animate-tab-glow-expand",
                        `bg-gradient-to-br from-${item.id}-primary/10 via-${item.id}-primary/5 to-transparent`
                      )}
                    style={{
                      background: `radial-gradient(circle at center, hsl(var(--${item.id}-primary) / 0.15) 0%, hsl(var(--${item.id}-primary) / 0.05) 50%, transparent 100%)`
                    }}
                  />
                )}
                
                <Icon className={cn(
                  "relative z-10 transition-all duration-300 flex-shrink-0",
                  isActive 
                    ? cn(
                        "h-6 w-6 animate-soft-glow",
                        `text-${item.id}-primary`,
                        // Icon-specific glow
                        `drop-shadow-sm`
                      )
                    : "h-4 w-4 hover:scale-110 transition-all duration-200"
                )}
                style={isActive ? {
                  filter: `drop-shadow(0 0 4px hsl(var(--${item.id}-primary) / 0.5))`
                } : {}}
                />
                
                <span className={cn(
                  "relative z-10 text-xs transition-all duration-300 truncate",
                  isActive 
                    ? cn(
                        `text-${item.id}-primary font-semibold`,
                        "animate-fade-in"
                      )
                    : "text-muted-foreground font-medium hover:font-semibold"
                )}
                style={isActive ? {
                  textShadow: `0 0 8px hsl(var(--${item.id}-primary) / 0.3)`
                } : {}}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}