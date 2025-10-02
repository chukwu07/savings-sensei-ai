// Security logging utility for audit trails
interface SecurityEvent {
  userId?: string;
  event: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

class SecurityLogger {
  private static instance: SecurityLogger;

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Log to console with structured format
    console.log('🔒 SECURITY EVENT:', JSON.stringify(securityEvent, null, 2));

    // Store in localStorage for client-side events (with rotation)
    if (typeof window !== 'undefined') {
      this.storeLocalSecurityEvent(securityEvent);
    }
  }

  private storeLocalSecurityEvent(event: SecurityEvent): void {
    try {
      const storageKey = 'security_events';
      const maxEvents = 50; // Keep only last 50 events
      
      const existing = localStorage.getItem(storageKey);
      const events: SecurityEvent[] = existing ? JSON.parse(existing) : [];
      
      events.unshift(event);
      events.splice(maxEvents); // Keep only maxEvents
      
      localStorage.setItem(storageKey, JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to store security event:', error);
    }
  }

  getLocalSecurityEvents(): SecurityEvent[] {
    try {
      const existing = localStorage.getItem('security_events');
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.warn('Failed to retrieve security events:', error);
      return [];
    }
  }

  logAuthEvent(userId: string | null, event: string, success: boolean, details?: Record<string, any>): void {
    this.logSecurityEvent({
      userId: userId || 'anonymous',
      event: `auth.${event}`,
      details: {
        success,
        ...details,
      },
    });
  }

  logAPICall(userId: string | null, endpoint: string, success: boolean, details?: Record<string, any>): void {
    this.logSecurityEvent({
      userId: userId || 'anonymous',
      event: `api.${endpoint}`,
      details: {
        success,
        ...details,
      },
    });
  }

  logSensitiveOperation(userId: string, operation: string, details?: Record<string, any>): void {
    this.logSecurityEvent({
      userId,
      event: `sensitive.${operation}`,
      details: {
        ...details,
      },
    });
  }
}

export const securityLogger = SecurityLogger.getInstance();