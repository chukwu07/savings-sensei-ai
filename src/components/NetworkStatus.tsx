import React from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { SyncService } from '@/services/syncService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const NetworkStatus: React.FC = () => {
  const { isOnline, isConnecting } = useNetwork();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isManualSyncing, setIsManualSyncing] = React.useState(false);

  // Check pending sync count
  React.useEffect(() => {
    const checkPendingSync = async () => {
      try {
        const count = await SyncService.getPendingSyncCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Failed to get pending sync count:', error);
      }
    };

    checkPendingSync();
    const interval = setInterval(checkPendingSync, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!user || !isOnline || isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      await SyncService.performFullSync(user.id, toast);
      setPendingCount(0);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !isConnecting) {
    return null; // Hide when everything is in sync
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      {isConnecting ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Connecting...
        </Badge>
      ) : isOnline ? (
        pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="h-6 px-2 text-xs"
            >
              {isManualSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                'Sync'
              )}
            </Button>
          </div>
        )
      ) : (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
          {pendingCount > 0 && ` · ${pendingCount} pending`}
        </Badge>
      )}
    </div>
  );
};