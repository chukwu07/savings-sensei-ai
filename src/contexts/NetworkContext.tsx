import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface NetworkContextType {
  isOnline: boolean;
  connectionType: string;
  isConnecting: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initializeNetworkStatus = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        } catch (error) {
          console.log('Network status not available, defaulting to online');
          setIsOnline(true);
        }
      } else {
        // Web platform - use navigator.onLine
        setIsOnline(navigator.onLine);
        setConnectionType(navigator.onLine ? 'wifi' : 'none');
      }
    };

    initializeNetworkStatus();

    if (Capacitor.isNativePlatform()) {
      // Native platform listeners
      let networkListener: any;
      
      const setupListener = async () => {
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          const wasOffline = !isOnline;
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
          
          // Show connecting state briefly when coming back online
          if (wasOffline && status.connected) {
            setIsConnecting(true);
            setTimeout(() => setIsConnecting(false), 2000);
          }
        });
      };
      
      setupListener();

      return () => {
        if (networkListener) {
          networkListener.remove();
        }
      };
    } else {
      // Web platform listeners
      const handleOnline = () => {
        const wasOffline = !isOnline;
        setIsOnline(true);
        setConnectionType('wifi');
        
        if (wasOffline) {
          setIsConnecting(true);
          setTimeout(() => setIsConnecting(false), 2000);
        }
      };

      const handleOffline = () => {
        setIsOnline(false);
        setConnectionType('none');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, connectionType, isConnecting }}>
      {children}
    </NetworkContext.Provider>
  );
};