// Zod-based validation schemas for edge functions
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// AI Chat message validation
export const aiChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(2000)
  })).min(1).max(20)
});

// Stripe subscription creation validation
export const subscriptionSchema = z.object({
  priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID'),
  paymentMethodId: z.string().regex(/^pm_[a-zA-Z0-9]+$/, 'Invalid payment method ID'),
  customerId: z.string().regex(/^cus_[a-zA-Z0-9]+$/, 'Invalid customer ID')
});

// Stripe checkout validation
export const checkoutSchema = z.object({
  priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/, 'Invalid Stripe price ID').optional()
});

// Transaction validation for recurring transactions processing
export const transactionSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive().max(999999999),
  category: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// Promo code redemption validation
export const promoCodeRedemptionSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Invalid promo code format')
});

// Helper function to format Zod errors
export function formatZodError(error: z.ZodError): string {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}
