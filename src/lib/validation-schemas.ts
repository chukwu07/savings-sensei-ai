import { z } from 'zod';

// Transaction validation
export const transactionSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters"),
  amount: z.number()
    .positive("Amount must be positive")
    .max(999999999, "Amount is too large")
    .refine((val) => !isNaN(val), "Invalid amount"),
  category: z.string()
    .trim()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters"),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be income or expense" })
  }),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// Budget validation
export const budgetSchema = z.object({
  category: z.string()
    .trim()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters"),
  allocated: z.number()
    .positive("Budget amount must be positive")
    .max(999999999, "Budget amount is too large"),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
    errorMap: () => ({ message: "Invalid period" })
  }),
  spent: z.number()
    .min(0, "Spent amount cannot be negative")
    .max(999999999, "Spent amount is too large")
    .optional()
    .default(0)
});

export type BudgetInput = z.infer<typeof budgetSchema>;

// Savings goal validation
export const savingsGoalSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be less than 100 characters"),
  target_amount: z.number()
    .positive("Target amount must be positive")
    .max(999999999, "Target amount is too large"),
  current_amount: z.number()
    .min(0, "Current amount cannot be negative")
    .max(999999999, "Current amount is too large")
    .optional()
    .default(0),
  deadline: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .refine((date) => {
      const deadlineDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadlineDate >= today;
    }, "Deadline must be in the future")
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

// Profile validation
export const profileSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters"),
  lastName: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters")
});

export type ProfileInput = z.infer<typeof profileSchema>;

// AI chat message validation
export const chatMessageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be less than 2000 characters")
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Helper function to format Zod errors for display
export function formatZodError(error: z.ZodError): string {
  return error.errors.map(err => err.message).join(', ');
}
