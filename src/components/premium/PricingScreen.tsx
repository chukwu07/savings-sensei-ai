import React from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Check, X, Crown, Zap, Calendar, XCircle } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';
import { getPricingPlans } from '@/lib/stripe-pricing';
import type { PricingPlan } from '@/lib/stripe-pricing';
import { PremiumBadge } from './PremiumBadge';
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog';
import { PaymentDialog } from './PaymentDialog';

export function PricingScreen() {
  const { subscribed, cancelAtPeriodEnd, subscriptionEnd, cancelSubscription, getRemainingDays, checkSubscription } = usePremium();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PricingPlan | undefined>();
  
  const pricingPlans = getPricingPlans();
  const monthlyPlan = pricingPlans.find(p => p.interval === 'month')!;

  const handleSubscribe = () => {
    setSelectedPlan(monthlyPlan);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setPaymentDialogOpen(false);
    await checkSubscription();
  };

  const handleReactivate = () => {
    // Open payment dialog to allow plan selection during reactivation
    setSelectedPlan(monthlyPlan);
    setPaymentDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const remainingDays = getRemainingDays();
  const features = {
    free: [{
      name: 'Basic Budgeting',
      included: true
    }, {
      name: 'Expense Tracking',
      included: true
    }, {
      name: 'Up to 3 Savings Goals',
      included: true
    }, {
      name: '10 AI Messages/day',
      included: true
    }, {
      name: 'AI Financial Coaching',
      included: false
    }, {
      name: 'Multi-account Sync',
      included: false
    }, {
      name: 'Advanced Analytics',
      included: false
    }, {
      name: 'Priority Support',
      included: false
    }],
    premium: [{
      name: 'Everything in Free',
      included: true
    }, {
      name: 'Unlimited AI Messages',
      included: true
    }, {
      name: 'AI Smart Insights',
      included: true
    }, {
      name: 'Automated Savings Goals',
      included: true
    }, {
      name: 'Multi-account Sync',
      included: true
    }, {
      name: 'Advanced Analytics',
      included: true
    }, {
      name: 'Priority Support',
      included: true
    }, {
      name: 'Spending Forecasts',
      included: true
    }]
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        
        <p className="text-muted-foreground text-lg">
          Smarter money moves, simplified with AI-powered insights
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Plan */}
        <EnhancedCard variant="default" className="relative">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Free</h3>
              <div className="space-y-1">
                <div className="text-3xl font-bold">£0</div>
                <div className="text-muted-foreground">per month</div>
              </div>
            </div>

            <div className="space-y-3">
              {features.free.map((feature, index) => <div key={index} className="flex items-center gap-3">
                  {feature.included ? <Check className="h-5 w-5 text-green-500 flex-shrink-0" /> : <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                  <span className={feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    {feature.name}
                  </span>
                </div>)}
            </div>

            <Button variant="outline" className="w-full" disabled={!subscribed}>
              {subscribed ? 'Current Plan' : 'Continue with Free'}
            </Button>
          </div>
        </EnhancedCard>

        {/* Premium Plan */}
        <EnhancedCard variant="primary" className="relative border-primary">
          {/* Most Popular Badge */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <PremiumBadge />
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Premium</h3>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">£6.99</span>
                  <span className="text-muted-foreground">per month</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  or £69.99/year (save 2 months)
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {features.premium.map((feature, index) => <div key={index} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-foreground">{feature.name}</span>
                </div>)}
            </div>

            {subscribed ? (
              <div className="space-y-3">
                {cancelAtPeriodEnd ? (
                  <>
                    <div className="space-y-2 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="flex items-center gap-2 text-warning">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold">Subscription Cancelled</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-foreground">
                          Access until <strong>{formatDate(subscriptionEnd)}</strong> ({remainingDays} days)
                        </p>
                        <p className="text-muted-foreground">
                          You will not be charged again
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleReactivate}
                      className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Reactivate or Change Plan
                    </Button>
                  </>
                ) : (
                  <>
                    {remainingDays !== null && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Renews on {formatDate(subscriptionEnd)}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={() => setCancelDialogOpen(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              >
                <Zap className="h-4 w-4 mr-2" />
                Subscribe Now
              </Button>
            )}
          </div>
        </EnhancedCard>
      </div>

      {/* Trust Section */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Cancel anytime • Secure payments • No hidden fees
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span>30-day money-back guarantee</span>
          <span>•</span>
          <span>Instant activation</span>
        </div>
      </div>

      <CancelSubscriptionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={cancelSubscription}
        remainingDays={remainingDays}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        initialPlan={selectedPlan}
        onSuccess={handlePaymentSuccess}
      />
    </div>;
}