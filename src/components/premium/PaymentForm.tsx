import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import type { PricingPlan } from '@/lib/stripe-pricing';

interface PaymentFormProps {
  clientSecret: string;
  plan: PricingPlan;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ clientSecret, plan, onSuccess, onError }: PaymentFormProps) {
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
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/settings',
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
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
        <div className="p-3 bg-primary/10 rounded-full">
          <CheckCircle2 className="h-12 w-12 text-primary animate-in zoom-in duration-300" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">Payment Successful!</h3>
          <p className="text-muted-foreground">
            Welcome to {plan.name}. Your subscription is now active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Plan</span>
          <span className="text-sm font-semibold">{plan.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-bold">
            {plan.currency.toUpperCase()} £{plan.price}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Billed {plan.interval === 'month' ? 'monthly' : 'annually'}
        </p>
      </div>

      <div className="space-y-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </>
        ) : (
          `Pay £${plan.price}`
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment information is secure and encrypted. Cancel anytime.
      </p>
    </form>
  );
}
