import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Crown, Zap } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';
import { PaymentDialog } from './PaymentDialog';
import { getPricingPlans } from '@/lib/stripe-pricing';

interface UpgradePromptProps {
  feature: string;
  title: string;
  description: string;
  className?: string;
}

export function UpgradePrompt({ feature, title, description, className }: UpgradePromptProps) {
  const { checkSubscription } = usePremium();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  const pricingPlans = getPricingPlans();
  const monthlyPlan = pricingPlans.find(p => p.interval === 'month')!;

  const handlePaymentSuccess = async () => {
    await checkSubscription();
    setPaymentDialogOpen(false);
  };

  return (
    <>
      <EnhancedCard className={`text-center ${className}`} variant="primary">
        <div className="space-y-4 p-6">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Crown className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
          
          <Button 
            onClick={() => setPaymentDialogOpen(true)}
            className="w-full"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
          
          <p className="text-xs text-muted-foreground">
            £6.99/month • Cancel anytime
          </p>
        </div>
      </EnhancedCard>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        plan={monthlyPlan}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}