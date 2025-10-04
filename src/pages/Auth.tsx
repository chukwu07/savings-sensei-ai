import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuthScreen = 'sign-in' | 'create-account' | 'log-in' | 'loading' | 'forgot-password';

export default function Auth() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('sign-in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Signing you in...");
  const [preFilledEmail, setPreFilledEmail] = useState("");
  const [preFilledPassword, setPreFilledPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();

  // Load last used email on component mount
  useEffect(() => {
    const lastEmail = localStorage.getItem('budgetbuddy_last_email');
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords don't match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter both first and last name.",
        variant: "destructive"
      });
      return;
    }

    setCurrentScreen('loading');
    setLoadingMessage("Creating your account...");

    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      const result = await signUp(email, password, displayName);
      
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

  const handleGoogleSignIn = async () => {
    setCurrentScreen('loading');
    setLoadingMessage("Connecting to Google...");
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('Google Sign-In Error:', error);
        toast({
          title: "Google Sign-In Failed",
          description: error.message || "Please try again.",
          variant: "destructive"
        });
        setCurrentScreen('sign-in');
      }
      // If no error, the OAuth flow will redirect and onAuthStateChange will handle the rest
    } catch (err) {
      console.error('Google Sign-In Exception:', err);
      toast({
        title: "Google Sign-In Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      setCurrentScreen('sign-in');
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
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
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
        Sign in with Email
      </Button>

      <Button
        onClick={handleGoogleSignIn}
        variant="outline"
        className="w-full h-14 bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-3 font-medium"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="mt-1 h-12"
            />
          </div>
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
              placeholder="Create a password"
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
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 h-12"
          />
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
        
        {loadingMessage.includes('Google') && (
          <div className="mt-4 opacity-60">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      {currentScreen === 'sign-in' && renderSignInScreen()}
      {currentScreen === 'create-account' && renderCreateAccountScreen()}
      {currentScreen === 'log-in' && renderLogInScreen()}
      {currentScreen === 'forgot-password' && renderForgotPasswordScreen()}
      {currentScreen === 'loading' && renderLoadingScreen()}
    </div>
  );
}