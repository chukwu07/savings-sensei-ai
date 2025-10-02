import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { securityLogger } from '@/utils/securityLogger';
interface SecurityEvent {
  userId?: string;
  event: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}
export function SecurityMonitor() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  useEffect(() => {
    if (isVisible) {
      loadEvents();
      const interval = setInterval(loadEvents, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);
  const loadEvents = () => {
    const securityEvents = securityLogger.getLocalSecurityEvents();
    setEvents(securityEvents);
    setLastCheck(new Date());
  };
  const clearEvents = () => {
    localStorage.removeItem('security_events');
    setEvents([]);
    securityLogger.logSecurityEvent({
      event: 'security.events_cleared',
      details: {
        clearedBy: 'user'
      }
    });
  };
  const getEventBadgeVariant = (event: string) => {
    if (event.includes('sign_in') || event.includes('sign_up')) {
      return 'default';
    }
    if (event.includes('suspicious') || event.includes('failed')) {
      return 'destructive';
    }
    if (event.includes('api') || event.includes('ai')) {
      return 'secondary';
    }
    return 'outline';
  };
  const getEventIcon = (event: string) => {
    if (event.includes('suspicious') || event.includes('failed')) {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return <CheckCircle className="w-3 h-3" />;
  };
  if (!isVisible) {
    return <div className="fixed bottom-20 right-4 z-50">
        
      </div>;
  }
  return <div className="fixed bottom-20 right-4 z-50 w-96 max-h-96">
      <Card className="bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Security Monitor
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearEvents} disabled={events.length === 0}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {lastCheck.toLocaleTimeString()}
          </p>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-2">
          {events.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
              No security events recorded
            </p> : events.map((event, index) => <div key={index} className="flex items-start gap-2 p-2 rounded-lg border bg-card/50">
                <div className="mt-0.5">
                  {getEventIcon(event.event)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getEventBadgeVariant(event.event)} className="text-xs">
                      {event.event}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.details.success !== undefined && <p className="text-xs text-muted-foreground">
                      Status: {event.details.success ? 'Success' : 'Failed'}
                    </p>}
                  {event.details.email && <p className="text-xs text-muted-foreground truncate">
                      Email: {event.details.email}
                    </p>}
                  {event.details.reason && <p className="text-xs text-destructive">
                      {event.details.reason}
                    </p>}
                </div>
              </div>)}
        </CardContent>
      </Card>
    </div>;
}