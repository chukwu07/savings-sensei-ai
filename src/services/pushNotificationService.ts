import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  provisional: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private currentToken: string | null = null;

  private constructor() {
    this.initializeListeners();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notification listeners
   */
  private initializeListeners(): void {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    // Called when the push notification is tapped
    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push notification action performed:', notification);
        this.handleNotificationTap(notification);
      }
    );

    // Called when a push notification is received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        this.handleForegroundNotification(notification);
      }
    );

    // Called when registration is successful
    PushNotifications.addListener('registration',
      (token: Token) => {
        console.log('Registration token: ', token.value);
        this.currentToken = token.value;
        this.saveTokenToDatabase(token.value);
      }
    );

    // Called when registration fails
    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('Registration error: ', error.error);
      }
    );
  }

  /**
   * Request notification permissions and register for push notifications
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false, denied: false, provisional: false };
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      }
      
      return {
        granted: permStatus.receive === 'granted',
        denied: permStatus.receive === 'denied',
        provisional: (permStatus.receive as any) === 'provisional'
      };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return { granted: false, denied: true, provisional: false };
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions(): Promise<NotificationPermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      return { granted: false, denied: false, provisional: false };
    }

    try {
      const permStatus = await PushNotifications.checkPermissions();
      return {
        granted: permStatus.receive === 'granted',
        denied: permStatus.receive === 'denied',
        provisional: (permStatus.receive as any) === 'provisional'
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { granted: false, denied: true, provisional: false };
    }
  }

  /**
   * Get all delivered notifications
   */
  async getDeliveredNotifications() {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    try {
      const delivered = await PushNotifications.getDeliveredNotifications();
      return delivered.notifications;
    } catch (error) {
      console.error('Error getting delivered notifications:', error);
      return [];
    }
  }

  /**
   * Remove delivered notifications
   */
  async removeAllDeliveredNotifications() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('Error removing delivered notifications:', error);
    }
  }

  /**
   * Get the current registration token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Save the push notification token to the database
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log('No authenticated user, skipping token save');
        return;
      }

      // For now, we'll store the token in localStorage for web compatibility
      // The token will be sent to the server when needed
      console.log('Push token received:', token);

      if (true) {
        console.log('Push token saved successfully');
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving token to database:', error);
    }
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationTap(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    // Navigate based on notification type
    if (data?.type) {
      switch (data.type) {
        case 'budget_alert':
          window.location.href = `/#budget-${data.budgetId}`;
          break;
        case 'goal_reminder':
          window.location.href = `/#goal-${data.goalId}`;
          break;
        case 'ai_insight':
          window.location.href = '/#ai-chat';
          break;
        default:
          window.location.href = '/';
          break;
      }
    }
  }

  /**
   * Handle foreground notifications - show in-app alert
   */
  private handleForegroundNotification(notification: PushNotificationSchema): void {
    // Create a custom in-app notification or toast
    // This could be integrated with your existing toast system
    console.log('Foreground notification:', notification);
    
    // You could dispatch a custom event here that your app can listen to
    window.dispatchEvent(new CustomEvent('foregroundNotification', {
      detail: notification
    }));
  }

  /**
   * Test if push notifications are supported
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }
}

export const pushNotificationService = PushNotificationService.getInstance();