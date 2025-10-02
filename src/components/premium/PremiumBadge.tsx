import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
interface PremiumBadgeProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
  className?: string;
}
export function PremiumBadge({
  variant = 'default',
  size = 'default',
  className
}: PremiumBadgeProps) {
  return null;
}