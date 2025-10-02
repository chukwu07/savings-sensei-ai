import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { SafeChart } from "@/components/ui/safe-chart";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn, formatCurrency } from "@/lib/utils";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertTriangle
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";

export function Dashboard() {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { goals, loading: goalsLoading } = useSavingsGoals();

  // Add debug logging
  console.log('Dashboard render:', { 
    transactionsCount: transactions?.length, 
    budgetsCount: budgets?.length, 
    goalsCount: goals?.length,
    loading: transactionsLoading || budgetsLoading || goalsLoading
  });

  const loading = transactionsLoading || budgetsLoading || goalsLoading;

  // Calculate metrics from real data  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Available funds = Income - Expenses
  const availableFunds = totalIncome - totalExpenses;
  
  // Budget remaining is separate from available funds
  const remainingBudget = budgets.reduce((sum, b) => sum + (b.allocated - b.spent), 0);
  
  const savingsProgress = {
    current: goals.reduce((sum, g) => sum + g.current_amount, 0),
    target: goals.reduce((sum, g) => sum + g.target_amount, 0)
  };

  // Calculate spending by category
  const spendingByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.category === t.category);
      if (existing) {
        existing.amount += t.amount;
      } else {
        acc.push({ category: t.category, amount: t.amount });
      }
      return acc;
    }, []);
  
  // Prepare data for spending over time chart
  const spendingOverTime = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t, index) => ({
      date: new Date(t.date).getDate(),
      amount: t.amount,
      cumulative: transactions
        .filter(tx => tx.type === 'expense' && new Date(tx.date) <= new Date(t.date))
        .reduce((sum, tx) => sum + tx.amount, 0)
    }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">Financial Dashboard</h1>
          <p className="text-muted-foreground">Loading your financial data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <EnhancedCard key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </EnhancedCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-fade-in">
      {/* Mobile-optimized Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-mobile-2xl font-bold gradient-text mb-2">Your Finances</h1>
          <p className="text-mobile-sm text-muted-foreground">
            Track your money at a glance
          </p>
        </div>
      </div>

      {/* Mobile-first Key Metrics Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <EnhancedCard
          variant="primary"
          title="Total Income"
          value={totalIncome}
          trend="up"
          icon={<DollarSign className="h-4 w-4" />}
        />
        
        <EnhancedCard
          title="Total Expenses"
          value={totalExpenses}
          trend="down"
          icon={<CreditCard className="h-4 w-4" />}
        />
        
        <EnhancedCard
          variant="success"
          title="Available Funds"
          value={availableFunds}
          trend={availableFunds >= 0 ? "up" : "down"}
          icon={<Wallet className="h-4 w-4" />}
        />
        
        <EnhancedCard
          title="Savings Progress"
          value={`${savingsProgress.current}/${savingsProgress.target}`}
          trend="up"
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </div>

      {/* Mobile-optimized Budget Progress */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <EnhancedCard title="Budget Overview" variant="floating">
          <div className="space-y-4">
            {budgets.map((budget) => {
              const percentage = (budget.spent / budget.allocated) * 100;
              const isOverBudget = percentage > 90;
              
              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{budget.category}</span>
                    <div className="flex items-center gap-1">
                      {isOverBudget && <AlertTriangle className="h-3 w-3 text-warning" />}
                      <span className={isOverBudget ? "text-warning font-medium" : ""}>
                        {formatCurrency(budget.spent)}/{formatCurrency(budget.allocated)}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2",
                      isOverBudget && "bg-warning/20"
                    )}
                  />
                </div>
              );
            })}
          </div>
        </EnhancedCard>

        {/* Spending by Category Pie Chart */}
        <EnhancedCard title="Spending by Category" variant="glowing">
          <div className="h-[250px]">
            <SafeChart fallbackTitle="spending breakdown">
              {spendingByCategory.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                    },
                    ...spendingByCategory.reduce((acc, item, index) => {
                      const colors = ['hsl(210 100% 56%)', 'hsl(160 60% 50%)', 'hsl(45 100% 60%)', 'hsl(0 84% 60%)', 'hsl(280 60% 60%)'];
                      acc[item.category] = {
                        label: item.category,
                        color: colors[index % colors.length],
                      };
                      return acc;
                    }, {} as any)
                  }}
                >
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      cx="50%"
                      cy="40%"
                      outerRadius={70}
                      fill="hsl(var(--primary))"
                      dataKey="amount"
                    >
                      {spendingByCategory.map((entry, index) => {
                        const colors = ['hsl(210 100% 56%)', 'hsl(160 60% 50%)', 'hsl(45 100% 60%)', 'hsl(0 84% 60%)', 'hsl(280 60% 60%)'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">No spending data available</p>
                </div>
              )}
            </SafeChart>
          </div>
        </EnhancedCard>
      </div>

      {/* Spending Over Time Chart */}
      <EnhancedCard title="Spending Trend" description="Daily cumulative expenses">
        <div className="h-[300px]">
          <SafeChart fallbackTitle="spending trend">
            {spendingOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-muted-foreground text-xs"
                    tickFormatter={(value) => `Day ${value}`}
                  />
                  <YAxis 
                    className="text-muted-foreground text-xs"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative']}
                    labelFormatter={(value) => `Day ${value}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No spending trend data available</p>
              </div>
            )}
          </SafeChart>
        </div>
      </EnhancedCard>
      </div>
    </ErrorBoundary>
  );
}