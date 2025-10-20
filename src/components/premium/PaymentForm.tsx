import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles } from 'lucide-react';
import type { PricingPlan } from '@/lib/stripe-pricing';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const paymentSchema = z.object({
  complete: z.boolean().refine(val => val === true, {
    message: 'Please complete all payment details',
  }),
});

interface PaymentFormProps {
  clientSecret: string;
  customerId: string;
  plan: PricingPlan;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ clientSecret, customerId, plan, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    onError('');

    try {
      // Submit the payment element to validate
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        onError(submitError.message || 'Please complete all payment details');
        setIsProcessing(false);
        return;
      }

      // Confirm the setup intent
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.origin + '/settings',
        },
      });

      if (setupError) {
        onError(setupError.message || 'Payment method validation failed');
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.payment_method) {
        // Create subscription via edge function
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error: subscriptionError } = await supabase.functions.invoke('create-subscription', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: {
            priceId: plan.priceId,
            paymentMethodId: setupIntent.payment_method,
            customerId: customerId,
          }
        });

        if (subscriptionError || !data) {
          onError('Failed to create subscription. Please try again.');
          setIsProcessing(false);
          return;
        }

        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative p-4 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-full">
            <CheckCircle2 className="h-16 w-16 text-primary animate-in zoom-in duration-300" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Payment Successful!
          </h3>
          <p className="text-muted-foreground">
            Welcome to Premium! Your subscription is now active.
          </p>
          <p className="text-sm text-muted-foreground">
            Enjoy unlimited AI insights and advanced features
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary-glow/5 border border-primary/10 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Plan</span>
          <span className="text-sm font-semibold">{plan.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Amount</span>
          <span className="text-2xl font-bold">
            £{plan.price}
          </span>
        </div>
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Billed {plan.interval === 'month' ? 'monthly' : 'annually'} • Cancel anytime
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Details</label>
        <PaymentElement 
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: {
                email: 'never',
              }
            },
          }}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Subscribe for £{plan.price}/{plan.interval === 'month' ? 'mo' : 'yr'}
          </>
        )}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          🔒 Secure payment powered by Stripe
        </p>
        <p className="text-xs text-muted-foreground">
          Your subscription starts immediately • Cancel anytime
        </p>
      </div>
    </form>
  );
}
