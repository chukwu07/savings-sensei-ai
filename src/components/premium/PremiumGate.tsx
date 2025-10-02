import React from 'react';
import { usePremiumFeatures } from '@/hooks/usePremiumFeatures';
import { UpgradePrompt } from './UpgradePrompt';

interface PremiumGateProps {
  children: React.ReactNode;
  feature: 'exportReports' | 'advancedAnalytics' | 'prioritySupport';
  fallback?: React.ReactNode;
}

export function PremiumGate({ children, feature, fallback }: PremiumGateProps) {
  const { canUseFeature } = usePremiumFeatures();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt 
      feature={feature}
      title={getFeatureTitle(feature)}
      description={getFeatureDescription(feature)}
    />
  );
}

function getFeatureTitle(feature: string): string {
  switch (feature) {
    case 'exportReports':
      return 'Export Reports';
    case 'advancedAnalytics':
      return 'Advanced Analytics';
    case 'prioritySupport':
      return 'Priority Support';
    default:
      return 'Premium Feature';
  }
}

function getFeatureDescription(feature: string): string {
  switch (feature) {
    case 'exportReports':
      return 'Export your financial data to PDF and CSV formats';
    case 'advancedAnalytics':
      return 'Get detailed insights and forecasting for your spending patterns';
    case 'prioritySupport':
      return 'Get priority support and faster response times';
    default:
      return 'Unlock this premium feature';
  }
}