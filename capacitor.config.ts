import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgetbuddy.ai',
  appName: 'BudgetBuddy AI',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  // server: {
  //   url: 'https://187e46dd-869a-43de-9d75-8e15f64f902f.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;