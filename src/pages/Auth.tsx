import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const getPageTitle = () => {
    if (isForgotPassword) return "Reset Password - Narrated";
    if (isSignUp) return "Sign Up - Narrated";
    return "Sign In - Narrated";
  };

  useEffect(() => {
    // Check for email and signup parameters in URL
    const urlParams = new URLSearchParams(location.search);
    const emailParam = urlParams.get('email');
    const signupParam = urlParams.get('signup');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (signupParam === 'true') {
      setIsSignUp(true);
    }
  }, [location]);

  useEffect(() => {
    // Don't redirect if user is on password reset page or if it's a recovery flow
    const isOnResetPage = location.pathname === '/reset-password';
    const urlParams = new URLSearchParams(location.search);
    const isRecoveryFlow = urlParams.get('type') === 'recovery' || urlParams.get('recovery') === 'true';
    
    // Check if user is already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !isOnResetPage && !isRecoveryFlow) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Sign-up tracking is now handled globally by useAuthTracking hook
        
        // Don't auto-redirect during password recovery
        if (session?.user && !isOnResetPage && !isRecoveryFlow) {
          setUser(session.user);
          navigate("/dashboard");
        } else if (!session?.user && !isRecoveryFlow) {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, location.search]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isSignUp) {
        // Check if passwords match
        if (password !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (error: any) {
      // Check if it's a password validation error and provide clear requirements
      const isPasswordError = error.message?.toLowerCase().includes('password');
      
      toast({
        title: "Authentication Error",
        description: isPasswordError 
          ? "Password must contain:\n• At least 6 characters\n• At least one lowercase letter\n• At least one uppercase letter\n• At least one number"
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          skipBrowserRedirect: false // Force full redirect on all devices
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Google OAuth Error:", error);
      toast({
        title: "Google Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?recovery=true`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a link to reset your password.",
      });
      
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Password Reset Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content="Access your Narrated account to continue your autobiography project. Create your account in seconds and start preserving your life story with AI assistance." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://narrated.com/auth" />
      </Helmet>
      <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="flex items-center justify-center min-h-screen p-4 pt-20">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isForgotPassword 
              ? "Enter your email to receive a password reset link"
              : isSignUp 
                ? "Start your autobiography journey today" 
                : "Sign in to your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isForgotPassword ? (
            // Forgot Password Form
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full min-h-[44px] touch-manipulation" variant="hero">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <>
          {/* Social Auth Buttons */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full min-h-[44px] touch-manipulation" 
              onClick={handleGoogleAuth}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] text-base"
                  required
                />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-[44px] text-base"
                required
              />
              {isSignUp && (
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• At least 6 characters</li>
                  <li>• At least one lowercase letter</li>
                  <li>• At least one uppercase letter</li>
                  <li>• At least one number</li>
                </ul>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="min-h-[44px] text-base"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full min-h-[44px] touch-manipulation" variant="hero">
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          </>
          )}

          <div className="text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp 
                  ? "Already have an account? " 
                  : "Don't have an account? "
                }
                <span className="text-blue-600 font-medium hover:text-blue-700">
                  {isSignUp ? "Sign in" : "Sign up"}
                </span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </>
  );
};

export default Auth;