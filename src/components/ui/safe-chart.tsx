import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AlertCircle } from 'lucide-react';

interface SafeChartProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

function ChartErrorFallback({ title }: { title?: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
      <div className="text-center space-y-2">
        <AlertCircle className="h-8 w-8 mx-auto" />
        <p className="text-sm">Unable to load {title || 'chart'}</p>
      </div>
    </div>
  );
}

export function SafeChart({ children, fallbackTitle }: SafeChartProps) {
  return (
    <ErrorBoundary fallback={<ChartErrorFallback title={fallbackTitle} />}>
      {children}
    </ErrorBoundary>
  );
}