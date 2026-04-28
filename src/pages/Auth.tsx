import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthScreen = 'sign-in' | 'create-account' | 'log-in' | 'loading' | 'forgot-password' | 'reset-password';

export default function Auth() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('sign-in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Signing you in...");
  const [preFilledEmail, setPreFilledEmail] = useState("");
  const [preFilledPassword, setPreFilledPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();

  // After successful auth, honour ?redirect=<same-origin path> so users return
  // to where they came from (e.g. opening Contact Support from /more).
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      window.history.replaceState({}, document.title, redirect);
      window.location.assign(redirect);
    }
  }, [user]);

  // Capture ?ref= URL param on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('budgetbuddy_referral_code', ref.toUpperCase());
      setReferralCode(ref.toUpperCase());
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const stored = localStorage.getItem('budgetbuddy_referral_code');
      if (stored) setReferralCode(stored);
    }
  }, []);

  // Check for password recovery session
  useEffect(() => {
    // Check URL hash for recovery token (Supabase appends type=recovery)
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('type=magiclink'))) {
      setCurrentScreen('reset-password');
    }

    // Check if we're already in a recovery session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.recovery_sent_at) {
        setCurrentScreen('reset-password');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCurrentScreen('reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load last used email on component mount
  useEffect(() => {
    const lastEmail = localStorage.getItem('budgetbuddy_last_email');
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/";

      const { error } = await signInWithGoogle(safeRedirect);

      if (error) {
        const msg = (error.message || "").toLowerCase();
        let description = "Couldn't start Google sign-in. Please try again or use email.";
        if (msg.includes("provider") && msg.includes("not enabled")) {
          description = "Google sign-in isn't set up yet. Please use email & password.";
        } else if (msg.includes("popup") || msg.includes("closed") || msg.includes("cancel")) {
          description = "Google sign-in was cancelled.";
        }
        toast({
          title: "Google Sign-In Failed",
          description,
          variant: "destructive",
        });
        setGoogleLoading(false);
      }
      // On success, browser redirects to Google — no need to reset state.
    } catch (err) {
      toast({
        title: "Google Sign-In Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "destructive"
      });
      return;
    }

    setCurrentScreen('loading');
    setLoadingMessage("Creating your account...");

    try {
      const result = await signUp(email, password, fullName.trim());
      
      if (result?.error) {
        // Check if user already exists
        if (result.error.message?.toLowerCase().includes('already') || 
            result.error.message?.toLowerCase().includes('exists')) {
          
          // Store credentials for pre-fill
          setPreFilledEmail(email);
          setPreFilledPassword(password);
          
          toast({
            title: "Account Already Exists",
            description: "Please log in with your existing account.",
          });
          setCurrentScreen('log-in');
        } else {
          toast({
            title: "Account Creation Failed",
            description: result.error.message || "Please try again.",
            variant: "destructive"
          });
          setCurrentScreen('create-account');
        }
      } else {
        // Store email for future context
        localStorage.setItem('budgetbuddy_last_email', email);
        
        // Redeem referral/promo code if present
        const codeToRedeem = referralCode || localStorage.getItem('budgetbuddy_referral_code');
        if (codeToRedeem) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data, error: redeemError } = await supabase.functions.invoke('redeem-promo-code', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: { code: codeToRedeem },
              });
              
              if (redeemError) {
                console.error('Promo code redemption failed:', redeemError);
              } else if (data?.success) {
                toast({
                  title: "🎉 Promo Code Applied!",
                  description: `You've been upgraded to ${data.subscription_tier}!`,
                });
              }
            }
          } catch (err) {
            console.error('Error redeeming promo code:', err);
          } finally {
            localStorage.removeItem('budgetbuddy_referral_code');
          }
        }
        // Account created successfully - user will be redirected by auth state change
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setCurrentScreen('create-account');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentScreen('loading');
    setLoadingMessage("Signing you in...");

    try {
      const result = await signIn(email, password);
      
      if (result?.error) {
        toast({
          title: "Login Failed",
          description: result.error.message || "Please check your credentials and try again.",
          variant: "destructive"
        });
        setCurrentScreen('log-in');
      } else {
        // Store email for future context
        localStorage.setItem('budgetbuddy_last_email', email);
        // User will be redirected by auth state change
      }
    } catch (error) {
      setCurrentScreen('log-in');
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setCurrentScreen('log-in');
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link.",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    setCurrentScreen('loading');
    setLoadingMessage("Updating your password...");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "You can now log in with your new password.",
      });

      // Clear fields and redirect to login
      setNewPassword("");
      setNewPasswordConfirm("");
      setCurrentScreen('log-in');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive"
      });
      setCurrentScreen('reset-password');
    }
  };

  // Screen 1: Main Sign In Screen
  const renderSignInScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-8">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-24 h-24 mx-auto mb-6 drop-shadow-lg"
        />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          BudgetBuddy AI
        </h1>
        <p className="text-muted-foreground text-sm">
          Your AI-powered financial companion
        </p>
      </div>

      <Button
        onClick={() => setCurrentScreen('create-account')}
        className="w-full h-14 text-lg font-semibold mb-4 bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-glow"
        size="lg"
      >
        Create Account
      </Button>

      <div className="text-center mt-4">
        <button
          onClick={() => setCurrentScreen('log-in')}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Already have an account? Log In
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
        Your data is encrypted and secure. We never share your information.
      </p>
    </div>
  );

  // Screen 2: Create Account Screen
  // Reusable Google sign-in block (button + divider)
  const renderGoogleAuthBlock = () => (
    <>
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        variant="outline"
        className="w-full h-12 text-base font-medium bg-background hover:bg-accent border-input"
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        <span>Continue with Google</span>
      </Button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );

  const renderCreateAccountScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-6">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground">
          Create Account
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Join BudgetBuddy AI with your email
        </p>
      </div>

      {renderGoogleAuthBlock()}

      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 h-12"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 h-12"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="referralCode" className="text-sm font-medium text-foreground">
            Referral Code <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="referralCode"
              type="text"
              placeholder="e.g. ALICE50"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="h-12 pl-10"
            />
            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300"
        >
          Create Account
        </Button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={() => setCurrentScreen('sign-in')}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to Sign In
        </button>
      </div>
    </div>
  );

  // Effect to handle pre-filled credentials for existing user login
  useEffect(() => {
    if (preFilledEmail && currentScreen === 'log-in') {
      setEmail(preFilledEmail);
      setPassword(preFilledPassword);
    }
  }, [preFilledEmail, preFilledPassword, currentScreen]);

  // Screen 3: Log In Screen
  const renderLogInScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-6">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground">
          Log In
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {preFilledEmail ? "Please log in with your existing account" : "Welcome back to BudgetBuddy AI"}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label htmlFor="loginEmail" className="text-sm font-medium text-foreground">
            Email Address
          </Label>
          <Input
            id="loginEmail"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 h-12"
          />
        </div>

        <div>
          <Label htmlFor="loginPassword" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative mt-1">
            <Input
              id="loginPassword"
              type={showLoginPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
            >
              {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300"
        >
          Log In
        </Button>
      </form>

      <div className="text-center mt-4 space-y-3">
        <button
          onClick={() => setCurrentScreen('forgot-password')}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Forgot Password?
        </button>
        
        <div>
          <button
            onClick={() => {
              // Clear pre-filled data when going back
              setPreFilledEmail("");
              setPreFilledPassword("");
              setCurrentScreen('sign-in');
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );

  // Screen 4: Forgot Password Screen
  const renderForgotPasswordScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-6">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground">
          Reset Password
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Enter your email to receive a reset link
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <Label htmlFor="resetEmail" className="text-sm font-medium text-foreground">
            Email Address
          </Label>
          <Input
            id="resetEmail"
            type="email"
            placeholder="Enter your email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
            className="mt-1 h-12"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300"
        >
          Send Reset Link
        </Button>
      </form>

      <div className="text-center mt-4">
        <button
          onClick={() => setCurrentScreen('log-in')}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to Log In
        </button>
      </div>
    </div>
  );

  // Screen 5: Loading Screen
  const renderLoadingScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-8">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-20 h-20 mx-auto mb-4 drop-shadow-md"
        />
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative mb-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse" />
        </div>
        
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {loadingMessage}
        </h2>
        
        <p className="text-muted-foreground text-center text-sm">
          This may take a few moments...
        </p>
      </div>
    </div>
  );

  // Screen 6: Reset Password Screen
  const renderResetPasswordScreen = () => (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-elegant p-8">
      <div className="text-center mb-6">
        <img 
          src="/icon-1024.png" 
          alt="BudgetBuddy AI" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground">
          Reset Your Password
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
            New Password
          </Label>
          <div className="relative mt-1">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password (min. 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="newPasswordConfirm" className="text-sm font-medium text-foreground">
            Confirm New Password
          </Label>
          <Input
            id="newPasswordConfirm"
            type="password"
            placeholder="Confirm your new password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
            minLength={6}
            className="mt-1 h-12"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300"
        >
          Reset Password
        </Button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={() => setCurrentScreen('log-in')}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      {currentScreen === 'sign-in' && renderSignInScreen()}
      {currentScreen === 'create-account' && renderCreateAccountScreen()}
      {currentScreen === 'log-in' && renderLogInScreen()}
      {currentScreen === 'forgot-password' && renderForgotPasswordScreen()}
      {currentScreen === 'reset-password' && renderResetPasswordScreen()}
      {currentScreen === 'loading' && renderLoadingScreen()}
    </div>
  );
}