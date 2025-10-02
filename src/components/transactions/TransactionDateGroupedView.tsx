import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Transaction } from "@/hooks/useTransactions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MonthNavigator } from "./MonthNavigator";

interface TransactionDateGroupedViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  getBudgetInsight?: (transaction: Transaction) => string;
}

interface DateGroup {
  date: string;
  transactions: Transaction[];
  totalAmount: number;
  dateLabel: string;
}

interface MonthData {
  year: number;
  month: number;
  monthLabel: string;
  totalAmount: number;
  dateGroups: DateGroup[];
}

function getDateGroups(transactions: Transaction[], selectedYear: number, selectedMonth: number): MonthData | null {
  // Filter transactions for the selected month
  const monthTransactions = transactions.filter(transaction => {
    const date = new Date(transaction.date);
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
  });
  
  if (monthTransactions.length === 0) return null;
  
  // Group transactions by date
  const dateGroups = new Map<string, DateGroup>();
  let monthTotal = 0;
  
  monthTransactions.forEach(transaction => {
    const dateStr = transaction.date;
    const date = new Date(transaction.date);
    const dateLabel = date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: '2-digit' 
    });
    
    if (!dateGroups.has(dateStr)) {
      dateGroups.set(dateStr, {
        date: dateStr,
        transactions: [],
        totalAmount: 0,
        dateLabel
      });
    }
    
    const group = dateGroups.get(dateStr)!;
    group.transactions.push(transaction);
    
    // Calculate total for the day (income positive, expenses negative)
    const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    group.totalAmount += amount;
    monthTotal += amount;
  });
  
  // Sort date groups by date (most recent first)
  const sortedDateGroups = Array.from(dateGroups.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });
  
  return {
    year: selectedYear,
    month: selectedMonth,
    monthLabel,
    totalAmount: monthTotal,
    dateGroups: sortedDateGroups
  };
}

export function TransactionDateGroupedView({ 
  transactions, 
  onDeleteTransaction, 
  getBudgetInsight 
}: TransactionDateGroupedViewProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  
  const monthData = useMemo(() => 
    getDateGroups(transactions, selectedYear, selectedMonth),
    [transactions, selectedYear, selectedMonth]
  );
  
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };
  
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
  };
  
  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth > 0) {
        setSelectedMonth(selectedMonth - 1);
      } else {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(11);
      }
    } else {
      if (selectedMonth < 11) {
        setSelectedMonth(selectedMonth + 1);
      } else {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(0);
      }
    }
  };
  
  const toggleDate = (dateStr: string) => {
    const newOpenDates = new Set(openDates);
    if (newOpenDates.has(dateStr)) {
      newOpenDates.delete(dateStr);
    } else {
      newOpenDates.add(dateStr);
    }
    setOpenDates(newOpenDates);
  };
  
  return (
    <div className="space-y-4">
      <MonthNavigator
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
        onNavigateMonth={handleNavigateMonth}
      />
      
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedYear(currentDate.getFullYear());
            setSelectedMonth(currentDate.getMonth());
          }}
        >
          Jump to Current Month
        </Button>
      </div>
      
      {monthData && (
        <>
          {/* Monthly Rollup Header */}
          <EnhancedCard variant="floating">
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold">{monthData.monthLabel}</h2>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  Total: {monthData.totalAmount >= 0 ? '+' : ''}£{Math.abs(monthData.totalAmount).toFixed(2)}
                </span>
                <div className={`text-sm ${monthData.totalAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthData.totalAmount >= 0 ? 'Net Positive' : 'Net Negative'}
                </div>
              </div>
            </div>
          </EnhancedCard>
          
          {/* Date Groups */}
          {monthData.dateGroups.map((dateGroup) => {
            const isOpen = openDates.has(dateGroup.date);
            
            return (
              <Collapsible key={dateGroup.date} open={isOpen} onOpenChange={() => toggleDate(dateGroup.date)}>
                <EnhancedCard variant="floating">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-6 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <h3 className="font-medium text-lg">{dateGroup.dateLabel}</h3>
                        <Badge variant="outline" className="text-xs">
                          {dateGroup.transactions.length} transactions
                        </Badge>
                      </div>
                      
                      <div className={`text-sm font-medium ${dateGroup.totalAmount >= 0 ? 'text-success' : 'text-foreground'}`}>
                        {dateGroup.totalAmount >= 0 ? '+' : ''}£{Math.abs(dateGroup.totalAmount).toFixed(2)}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2 mt-3">
                    {dateGroup.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 px-2 hover:bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{transaction.description}</p>
                          {getBudgetInsight && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {getBudgetInsight(transaction)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              transaction.type === 'income' ? 'text-success' : 'text-foreground'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}£{transaction.amount.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTransaction(transaction.id);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </EnhancedCard>
              </Collapsible>
            );
          })}
        </>
      )}
      
      {!monthData && (
        <EnhancedCard className="text-center py-8">
          <p className="text-muted-foreground">No transactions found for the selected month.</p>
        </EnhancedCard>
      )}
    </div>
  );
}