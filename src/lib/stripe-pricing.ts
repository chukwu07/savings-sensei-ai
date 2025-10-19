export interface PricingPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

export const testPricingPlans: PricingPlan[] = [
  {
    id: 'premium-monthly-test',
    name: 'Premium Monthly',
    priceId: 'price_1SJoVnPTZemMTRjBFFFIE0UV',
    price: 6.99,
    currency: 'gbp',
    interval: 'month',
    features: [
      'Unlimited AI chat messages',
      'Unlimited savings goals',
      'Advanced analytics',
      'Priority support',
      'Export data',
    ],
  },
  {
    id: 'premium-yearly-test',
    name: 'Premium Yearly',
    priceId: 'price_1SJoWVPTZemMTRjB32qzRpKx',
    price: 69.99,
    currency: 'gbp',
    interval: 'year',
    features: [
      'Unlimited AI chat messages',
      'Unlimited savings goals',
      'Advanced analytics',
      'Priority support',
      'Export data',
      'Save 16% vs monthly',
    ],
  },
];

export const livePricingPlans: PricingPlan[] = [
  {
    id: 'premium-monthly-live',
    name: 'Premium Monthly',
    priceId: 'price_live_monthly_placeholder', // TODO: Replace with actual live price ID
    price: 6.99,
    currency: 'gbp',
    interval: 'month',
    features: [
      'Unlimited AI chat messages',
      'Unlimited savings goals',
      'Advanced analytics',
      'Priority support',
      'Export data',
    ],
  },
  {
    id: 'premium-yearly-live',
    name: 'Premium Yearly',
    priceId: 'price_live_yearly_placeholder', // TODO: Replace with actual live price ID
    price: 69.99,
    currency: 'gbp',
    interval: 'year',
    features: [
      'Unlimited AI chat messages',
      'Unlimited savings goals',
      'Advanced analytics',
      'Priority support',
      'Export data',
      'Save 16% vs monthly',
    ],
  },
];

// Determine if we're in test mode based on the Stripe key
export const isStripeTestMode = (): boolean => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  return stripeKey?.startsWith('pk_test_') ?? true;
};

// Get the appropriate pricing plans based on the environment
export const getPricingPlans = (): PricingPlan[] => {
  return isStripeTestMode() ? testPricingPlans : livePricingPlans;
};

// Get Stripe publishable key
export const getStripePublishableKey = (): string => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('Stripe publishable key is not configured');
  }
  return key;
};
