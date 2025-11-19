import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EnhancedCard } from "@/components/ui/enhanced-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageCircle, Bell, Settings, Mail, Send, Crown, LogOut, User } from "lucide-react";
import { Notifications } from "./Notifications";
import { AIChat } from "./AIChat";
import { CurrencySelector } from "./CurrencySelector";
import { PricingScreen } from "./premium/PricingScreen";
import { PushNotificationSettings } from "./PushNotificationSettings";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfileSettings } from "./ProfileSettings";

export function More() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentTab, setCurrentTab] = useState("notifications");
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const sendBudgetAlerts = async () => {
    setIsLoading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const {
        data,
        error
      } = await supabase.functions.invoke('send-budget-alerts', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      if (error) {
        throw error;
      }
      toast({
        title: "Budget Alerts Sent",
        description: `Successfully processed budget alerts. ${data.alertsSent} alerts were sent.`
      });
    } catch (error) {
      console.error('Error sending budget alerts:', error);
      toast({
        title: "Error",
        description: "Failed to send budget alerts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden pb-4">
      {/* Mobile Header */}
      <div className="pt-4 px-4">
        <h1 className="text-lg font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Additional tools and settings for your financial management
        </p>
      </div>

      {/* Subpage Links as Cards */}
      <div className="flex-1 overflow-hidden px-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col overflow-hidden space-y-6">
          <div className="px-4">
            <div className="flex overflow-x-auto md:overflow-x-visible gap-2 pb-2">
              <Button
                variant={currentTab === "notifications" ? "default" : "ghost"}
                className="flex-shrink-0 md:flex-shrink md:flex-1 h-auto p-2"
                onClick={() => setCurrentTab("notifications")}
              >
                <EnhancedCard className="p-3 min-w-[120px]">
                  <div className="flex flex-col items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <span className="text-xs font-medium text-center">Notifications</span>
                  </div>
                </EnhancedCard>
              </Button>

              <Button
                variant={currentTab === "ai" ? "default" : "ghost"}
                className="flex-shrink-0 md:flex-shrink md:flex-1 h-auto p-2"
                onClick={() => setCurrentTab("ai")}
              >
                <EnhancedCard className="p-3 min-w-[120px]">
                  <div className="flex flex-col items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-xs font-medium text-center">AI Chat</span>
                  </div>
                </EnhancedCard>
              </Button>

              <Button
                variant={currentTab === "premium" ? "default" : "ghost"}
                className="flex-shrink-0 md:flex-shrink md:flex-1 h-auto p-2"
                onClick={() => setCurrentTab("premium")}
              >
                <EnhancedCard className="p-3 min-w-[120px]">
                  <div className="flex flex-col items-center gap-2">
                    <Crown className="h-5 w-5" />
                    <span className="text-xs font-medium text-center">Premium</span>
                  </div>
                </EnhancedCard>
              </Button>

              <Button
                variant={currentTab === "settings" ? "default" : "ghost"}
                className="flex-shrink-0 md:flex-shrink md:flex-1 h-auto p-2"
                onClick={() => setCurrentTab("settings")}
              >
                <EnhancedCard className="p-3 min-w-[120px]">
                  <div className="flex flex-col items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span className="text-xs font-medium text-center">Account Settings</span>
                  </div>
                </EnhancedCard>
              </Button>
            </div>
          </div>

          <TabsList className="hidden">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="ai">AI Chat</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Notifications />
          </TabsContent>

          <TabsContent value="ai" className="h-full overflow-hidden">
            <AIChat />
          </TabsContent>

          <TabsContent value="premium">
            <div className="space-y-6">
              {/* Prominent Premium Badge Section */}
              <EnhancedCard variant="premium" className="text-center p-8">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Crown className="h-16 w-16 text-amber-500 animate-pulse" />
                      <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                      Upgrade to BudgetBuddy Premium
                    </h2>
                    <p className="text-muted-foreground">
                      Unlock unlimited features and advanced insights
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                      <Crown className="h-5 w-5" />
                      Premium Member
                    </div>
                  </div>
                </div>
              </EnhancedCard>
              <PricingScreen />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Profile Settings Section */}
            <ProfileSettings />

            {/* Sign Out Section */}
            <EnhancedCard variant="settings" className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Sign Out</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign out from your account
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isSigningOut}>
                      {isSigningOut ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing Out...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out? You'll need to sign in again to access your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </EnhancedCard>

            {/* Push Notification Settings */}
            <PushNotificationSettings />

            {/* Currency Settings */}
            <EnhancedCard variant="settings" className="p-6">
              <CurrencySelector />
            </EnhancedCard>

            {/* Budget Alerts */}
            <EnhancedCard variant="settings" className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Budget Alert System</h3>
                    <p className="text-sm text-muted-foreground">
                      Send email alerts when budgets exceed 80% usage
                    </p>
                  </div>
                </div>
                
                <Button onClick={sendBudgetAlerts} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking Budgets...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Check & Send Alerts
                    </>
                  )}
                </Button>
              </div>
            </EnhancedCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}