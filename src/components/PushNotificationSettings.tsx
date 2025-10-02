import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Bell, Smartphone, Settings as SettingsIcon } from "lucide-react";
import { usePushNotifications } from "@/contexts/PushNotificationContext";

export function PushNotificationSettings() {
  const {
    permissionStatus,
    isSupported,
    isEnabled,
    requestPermissions,
    toggleNotifications
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <EnhancedCard variant="floating" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-muted/20 rounded-lg">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Available on mobile devices only
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in web browsers. Install the mobile app to receive instant alerts for budget updates and financial insights.
        </p>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard variant="floating" className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Get instant alerts on your mobile device
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="push-notifications" className="text-sm font-medium">
                Enable Push Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive budget alerts, goal reminders, and AI insights
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={isEnabled && permissionStatus.granted}
              onCheckedChange={toggleNotifications}
              disabled={permissionStatus.denied}
            />
          </div>

          {/* Permission Status */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span>Permission Status:</span>
              <span className={`font-medium ${
                permissionStatus.granted ? 'text-success' : 
                permissionStatus.denied ? 'text-destructive' : 
                'text-warning'
              }`}>
                {permissionStatus.granted ? 'Granted' :
                 permissionStatus.denied ? 'Denied' :
                 permissionStatus.provisional ? 'Provisional' : 'Not Requested'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {!permissionStatus.granted && !permissionStatus.denied && (
            <Button onClick={requestPermissions} className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Enable Push Notifications
            </Button>
          )}

          {permissionStatus.denied && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Push notifications were denied. To enable them:
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Go to your device Settings</p>
                <p>• Find BudgetBuddy AI in your apps</p>
                <p>• Enable notifications</p>
                <p>• Restart the app</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  // Open device settings on mobile
                  if (window.navigator && 'serviceWorker' in window.navigator) {
                    // For web/PWA, provide instructions
                    alert('Please go to your browser settings > Site settings > Notifications to enable push notifications for this app.');
                  }
                }}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Open Device Settings
              </Button>
            </div>
          )}
        </div>

        {/* Notification Types */}
        {isEnabled && permissionStatus.granted && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Notification Types</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">Budget Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    When you exceed 90% of your budget
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">Goal Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Progress updates and deadline alerts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">AI Insights</Label>
                  <p className="text-xs text-muted-foreground">
                    Personalized financial tips and patterns
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm">Weekly Summaries</Label>
                  <p className="text-xs text-muted-foreground">
                    Your spending and savings overview
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}