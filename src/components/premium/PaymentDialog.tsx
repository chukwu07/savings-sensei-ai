import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/lib/stripe-pricing';
import { PaymentForm } from './PaymentForm';
import type { PricingPlan } from '@/lib/stripe-pricing';

const stripePromise = loadStripe(getStripePublishableKey());

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PricingPlan;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, plan, onSuccess }: PaymentDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open && !clientSecret) {
      createPaymentIntent();
    }
  }, [open]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('create-payment-intent', {
        body: { priceId: plan.priceId }
      });

      if (response.error) throw response.error;
      if (!response.data?.clientSecret) throw new Error('Failed to create payment intent');

      setClientSecret(response.data.clientSecret);
    } catch (err: any) {
      console.error('Payment intent creation error:', err);
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setClientSecret(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Complete Your Purchase</DialogTitle>
          <DialogDescription className="text-base">
            Subscribe to {plan.name} for {plan.currency.toUpperCase()} £{plan.price}/{plan.interval}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isLoading && !clientSecret && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Initializing payment...</p>
            </div>
          )}

          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                clientSecret={clientSecret}
                plan={plan}
                onSuccess={onSuccess}
                onError={(err) => setError(err)}
              />
            </Elements>
          )}

          {!isLoading && !clientSecret && error && (
            <Button 
              onClick={createPaymentIntent}
              className="w-full"
            >
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { supabase } from '@/integrations/supabase/client';
