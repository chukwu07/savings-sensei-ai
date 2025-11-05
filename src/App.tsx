import { Suspense, useState, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { PushNotificationProvider } from "@/contexts/PushNotificationContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { SplashScreen } from "@/components/SplashScreen";
import { BottomNav, TabType } from "@/components/BottomNav";
import { SecurityMonitor } from "@/components/SecurityMonitor";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

// Lazy load page components
const Home = lazy(() => import("./pages/Home"));
const Budget = lazy(() => import("./pages/Budget"));
const Goals = lazy(() => import("./pages/Goals"));
const MoneyHub = lazy(() => import("./pages/MoneyHub"));
const Settings = lazy(() => import("./pages/Settings"));

const queryClient = new QueryClient();

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showAuth, setShowAuth] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    if (showSplash) {
      return <SplashScreen onComplete={() => setShowSplash(false)} />;
    }
    
    if (showAuth) {
      return <Auth />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'budget':
        return <Budget />;
      case 'goals':
        return <Goals />;
      case 'moneyhub':
        return <MoneyHub />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <main className="pb-16 overflow-auto">
        <Suspense fallback={<LoadingFallback />}>
          {renderPage()}
        </Suspense>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <SecurityMonitor />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CurrencyProvider>
        <PremiumProvider>
          <PushNotificationProvider>
            <NetworkProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/*" element={<AppContent />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </NetworkProvider>
          </PushNotificationProvider>
        </PremiumProvider>
      </CurrencyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
