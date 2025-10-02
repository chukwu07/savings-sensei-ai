import React from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Crown, Zap } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

interface UpgradePromptProps {
  feature: string;
  title: string;
  description: string;
  className?: string;
}

export function UpgradePrompt({ feature, title, description, className }: UpgradePromptProps) {
  const { createCheckout } = usePremium();

  return (
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
          onClick={() => createCheckout()}
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
  );
}