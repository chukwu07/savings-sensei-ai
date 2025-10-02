import { useMemo } from 'react';
import { Transaction } from './useTransactions';
import { Budget } from './useBudgets';

export function useEnhancedTransactionInsights(transactions: Transaction[], budgets: Budget[]) {
  const getBudgetImpactInsight = useMemo(() => {
    return (transaction: Transaction): string => {
      if (transaction.type === 'income') {
        return "✅ Income added to your financial health!";
      }

      // Find matching budget for this transaction category
      const matchingBudget = budgets.find(budget => 
        budget.category.toLowerCase() === transaction.category.toLowerCase()
      );

      if (!matchingBudget) {
        return "⚠️ No budget set for this category - consider creating one!";
      }

      // Calculate new spent amount after this transaction
      const newSpent = matchingBudget.spent + transaction.amount;
      const percentage = Math.round((newSpent / matchingBudget.allocated) * 100);
      
      if (percentage >= 100) {
        return `🚨 BUDGET EXCEEDED! This puts you at ${percentage}% of your ${matchingBudget.category} budget`;
      } else if (percentage >= 80) {
        return `⚠️ Budget Alert: This pushes you to ${percentage}% of your ${matchingBudget.category} budget`;
      } else if (percentage >= 60) {
        return `📊 You're now at ${percentage}% of your ${matchingBudget.category} budget`;
      } else {
        return `✅ Within budget: ${percentage}% of ${matchingBudget.category} budget used`;
      }
    };
  }, [budgets]);

  const getSpendingPatternInsight = useMemo(() => {
    return (category: string, timeframe: 'week' | 'month'): string => {
      const now = new Date();
      const startDate = new Date(now);
      
      if (timeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= startDate && 
        t.category === category && 
        t.type === 'expense'
      );

      const totalSpent = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
      const transactionCount = recentTransactions.length;

      if (transactionCount === 0) {
        return `No ${category} expenses in the past ${timeframe}`;
      }

      const averagePerTransaction = totalSpent / transactionCount;
      const timeframeName = timeframe === 'week' ? 'week' : 'month';

      if (transactionCount >= 5) {
        return `💡 Frequent spending: ${transactionCount} ${category} transactions this ${timeframeName} (avg $${averagePerTransaction.toFixed(2)})`;
      } else if (totalSpent > 100) {
        return `💰 High spending: $${totalSpent.toFixed(2)} on ${category} this ${timeframeName}`;
      } else {
        return `✅ Moderate spending: $${totalSpent.toFixed(2)} on ${category} this ${timeframeName}`;
      }
    };
  }, [transactions]);

  const getCategoryRecommendation = useMemo(() => {
    return (description: string): { category: string; confidence: number } => {
      const desc = description.toLowerCase();
      
      // High confidence matches
      if (desc.includes('coffee') || desc.includes('restaurant') || desc.includes('food') || desc.includes('lunch') || desc.includes('dinner')) {
        return { category: 'Food & Drinks', confidence: 0.9 };
      }
      if (desc.includes('uber') || desc.includes('gas') || desc.includes('transport') || desc.includes('bus') || desc.includes('train')) {
        return { category: 'Transport', confidence: 0.9 };
      }
      if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
        return { category: 'Subscriptions', confidence: 0.9 };
      }
      if (desc.includes('movie') || desc.includes('game') || desc.includes('entertainment')) {
        return { category: 'Entertainment', confidence: 0.8 };
      }
      if (desc.includes('amazon') || desc.includes('store') || desc.includes('shopping')) {
        return { category: 'Shopping', confidence: 0.8 };
      }
      if (desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('medical') || desc.includes('health')) {
        return { category: 'Healthcare', confidence: 0.8 };
      }
      if (desc.includes('salary') || desc.includes('paycheck') || desc.includes('income') || desc.includes('bonus')) {
        return { category: 'Income', confidence: 0.9 };
      }
      
      // Default fallback
      return { category: 'Other', confidence: 0.5 };
    };
  }, []);

  return {
    getBudgetImpactInsight,
    getSpendingPatternInsight,
    getCategoryRecommendation
  };
}