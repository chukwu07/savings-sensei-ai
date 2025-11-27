import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthScreen = 'sign-in' | 'create-account' | 'log-in' | 'loading' | 'forgot-password' | 'reset-password';

export default function Auth() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('sign-in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Signing you in...");
  const [preFilledEmail, setPreFilledEmail] = useState("");
  const [preFilledPassword, setPreFilledPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  // Check for password recovery session
  useEffect(() => {
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
        redirectTo: `${window.location.origin}/`,
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
          <Input
            id="loginPassword"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 h-12"
          />
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
          className="text-sm text-gray-500 hover:text-foreground underline"
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