import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pushNotificationService, NotificationPermissionStatus } from '@/services/pushNotificationService';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationContextType {
  permissionStatus: NotificationPermissionStatus;
  isSupported: boolean;
  isEnabled: boolean;
  requestPermissions: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

interface PushNotificationProviderProps {
  children: ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    provisional: false
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  const isSupported = pushNotificationService.isSupported();

  useEffect(() => {
    if (isSupported) {
      checkPermissions();
      
      // Load saved preference
      const savedPreference = localStorage.getItem('push_notifications_enabled');
      setIsEnabled(savedPreference === 'true');
      
      // Listen for foreground notifications
      const handleForegroundNotification = (event: CustomEvent) => {
        const notification = event.detail;
        toast({
          title: notification.title,
          description: notification.body,
        });
      };

      window.addEventListener('foregroundNotification', handleForegroundNotification as EventListener);
      
      return () => {
        window.removeEventListener('foregroundNotification', handleForegroundNotification as EventListener);
      };
    }
  }, [isSupported, toast]);

  const checkPermissions = async () => {
    if (!isSupported) return;
    
    try {
      const status = await pushNotificationService.checkPermissions();
      setPermissionStatus(status);
      
      // Auto-enable if permissions are granted
      if (status.granted && localStorage.getItem('push_notifications_enabled') !== 'false') {
        setIsEnabled(true);
        localStorage.setItem('push_notifications_enabled', 'true');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermissions = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are only available on mobile devices.",
        variant: "destructive",
      });
      return;
    }

    try {
      const status = await pushNotificationService.requestPermissions();
      setPermissionStatus(status);
      
      if (status.granted) {
        setIsEnabled(true);
        localStorage.setItem('push_notifications_enabled', 'true');
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for budget alerts and insights.",
        });
      } else if (status.denied) {
        toast({
          title: "Permission Denied",
          description: "Push notifications were denied. You can enable them in your device settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: "Error",
        description: "Failed to enable push notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!isSupported) return;

    if (enabled && !permissionStatus.granted) {
      await requestPermissions();
      return;
    }

    setIsEnabled(enabled);
    localStorage.setItem('push_notifications_enabled', enabled.toString());
    
    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: enabled 
        ? "You'll receive push notifications for important updates."
        : "Push notifications have been disabled.",
    });
  };

  const value: PushNotificationContextType = {
    permissionStatus,
    isSupported,
    isEnabled,
    requestPermissions,
    checkPermissions,
    toggleNotifications,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}