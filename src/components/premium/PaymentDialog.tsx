import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PaymentForm } from "./PaymentForm";
import { supabase } from "@/integrations/supabase/client";
import { getStripePublishableKey, getPricingPlans } from "@/lib/stripe-pricing";
import type { PricingPlan } from "@/lib/stripe-pricing";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan?: PricingPlan;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, initialPlan, onSuccess }: PaymentDialogProps) {
  const pricingPlans = getPricingPlans();
  const [isYearly, setIsYearly] = useState(initialPlan?.interval === "year");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const stripePromise = loadStripe(getStripePublishableKey());

  const selectedPlan = isYearly
    ? pricingPlans.find((p) => p.interval === "year")!
    : pricingPlans.find((p) => p.interval === "month")!;

  const createSetupIntent = async () => {
    try {
      setIsLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-subscription-setup", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      setClientSecret(data.clientSecret);
      setCustomerId(data.customerId);
    } catch (err: any) {
      setError(err.message || "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setClientSecret("");
      setCustomerId("");
      setError("");
    }
  };

  useEffect(() => {
    if (open) {
      createSetupIntent();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 mt-6 pb-4">
          <DialogTitle>Subscribe to Premium</DialogTitle>
          <DialogDescription>Unlock unlimited AI insights and advanced features</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Plan Selection Toggle */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Label htmlFor="plan-toggle" className={!isYearly ? "font-semibold" : ""}>
              Monthly
            </Label>
            <Switch id="plan-toggle" checked={isYearly} onCheckedChange={setIsYearly} disabled={isLoading} />
            <Label htmlFor="plan-toggle" className={isYearly ? "font-semibold" : ""}>
              Yearly
              <span className="ml-1 text-xs text-primary">(Save 16%)</span>
            </Label>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Initializing payment...</p>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "hsl(var(--primary))",
                    colorBackground: "hsl(var(--background))",
                    colorText: "hsl(var(--foreground))",
                    colorDanger: "hsl(var(--destructive))",
                    fontFamily: "system-ui, sans-serif",
                    borderRadius: "0.5rem",
                  },
                },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                customerId={customerId}
                plan={selectedPlan}
                onSuccess={onSuccess}
                onError={setError}
              />
            </Elements>
          ) : null}

          {error && !isLoading && (
            <button onClick={createSetupIntent} className="text-sm text-primary hover:underline">
              Try Again
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
