import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/contexts/NetworkContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SyncService } from "@/services/syncService";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export const SimpleNetworkStatus: React.FC = () => {
  const { isOnline, isConnecting } = useNetwork();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPendingSync = async () => {
      if (user) {
        const count = await SyncService.getPendingSyncCount();
        setPendingCount(count);
      }
    };

    const interval = setInterval(checkPendingSync, 5000);
    checkPendingSync();
    return () => clearInterval(interval);
  }, [user]);

  const handleManualSync = async () => {
    if (!isOnline || isConnecting) return;
    
    try {
      toast({
        title: "Saving your data...",
        description: "This might take a moment",
      });
      
      await SyncService.performFullSync(user?.id || '', toast);
      setPendingCount(0);
      
      toast({
        title: "✅ All saved!",
        description: "Your data is safe in the cloud",
      });
    } catch (error) {
      toast({
        title: "Couldn't save right now",
        description: "We'll try again when you're back online",
        variant: "destructive"
      });
    }
  };

  // Hide if everything is good
  if (isOnline && !isConnecting && pendingCount === 0) {
    return null;
  }

  if (isConnecting) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Saving...
      </Badge>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualSync}
        className="flex items-center gap-1 h-8"
      >
        <Wifi className="h-3 w-3" />
        Save {pendingCount} items
      </Button>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Working offline
        {pendingCount > 0 && (
          <span className="ml-1 bg-warning text-warning-foreground px-1 rounded text-xs">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  return null;
};