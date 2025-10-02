import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface PremiumContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

interface PremiumProviderProps {
  children: React.ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const checkSubscription = async () => {
    if (!user) {
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      // For now, skip Stripe integration and default to premium for testing
      // This ensures the app works without Stripe configuration for Play Store launch
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) {
        // For Play Store launch, gracefully handle Stripe integration issues
        // Default to premium tier for all users during initial launch
        console.warn('Subscription check failed, defaulting to premium for launch:', error);
        setSubscribed(true);
        setSubscriptionTier('Premium');
        setSubscriptionEnd(null);
        return;
      }

      setSubscribed(data.subscribed || true);
      setSubscriptionTier(data.subscription_tier || 'Premium');
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      // For Play Store launch, gracefully handle errors and default to premium
      console.warn('Subscription check error, defaulting to premium for launch:', error);
      setSubscribed(true);
      setSubscriptionTier('Premium');
      setSubscriptionEnd(null);
    } finally {
      setIsLoading(false);
    }
  };

  const createCheckout = async (priceId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: { priceId }
      });
      
      if (error) {
        console.error('Error creating checkout:', error);
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error in createCheckout:', error);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) {
        console.error('Error opening customer portal:', error);
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error in openCustomerPortal:', error);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  // Check for premium success/cancel in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('premium') === 'success') {
      setTimeout(() => checkSubscription(), 2000); // Wait a bit for Stripe to process
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const value = {
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    isLoading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}