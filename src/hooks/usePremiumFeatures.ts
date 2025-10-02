import { usePremium } from '@/contexts/PremiumContext';

export interface PremiumLimits {
  aiChatMessages: number;
  savingsGoals: number;
  exportReports: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}

export function usePremiumFeatures() {
  const { subscribed, subscriptionTier, isLoading } = usePremium();

  const limits: PremiumLimits = {
    aiChatMessages: subscribed ? -1 : 10, // -1 = unlimited, 10 = daily limit for free
    savingsGoals: subscribed ? -1 : 3, // -1 = unlimited, 3 = max for free
    exportReports: subscribed,
    advancedAnalytics: subscribed,
    prioritySupport: subscribed,
  };

  const canUseFeature = (feature: keyof PremiumLimits): boolean => {
    if (isLoading) return false;
    
    switch (feature) {
      case 'aiChatMessages':
      case 'savingsGoals':
        return subscribed || limits[feature] > 0;
      default:
        return limits[feature] as boolean;
    }
  };

  const getFeatureLimit = (feature: keyof PremiumLimits): number | boolean => {
    return limits[feature];
  };

  const isFeatureUnlimited = (feature: 'aiChatMessages' | 'savingsGoals'): boolean => {
    return subscribed && limits[feature] === -1;
  };

  return {
    subscribed,
    subscriptionTier,
    isLoading,
    limits,
    canUseFeature,
    getFeatureLimit,
    isFeatureUnlimited,
  };
}