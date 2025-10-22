import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shirt, Mail, Lock, Loader2 } from "lucide-react";
import { diagnoseSupabaseAuth } from "@/utils/supabaseDebug";
import { trackUserLogin } from "@/utils/userActivity";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Debug function to check current environment
  const debugAuthEnvironment = async () => {
    const diagnostics = await diagnoseSupabaseAuth();
    
    // Additional manual checks
    console.log("\n🔧 OAuth Configuration Requirements:");
    console.log("Supabase Auth Settings should include:");
    console.log(`  Site URL: ${diagnostics.origin}`);
    console.log(`  Redirect URLs: ${diagnostics.redirectUrl}`);
    console.log(`  Google OAuth redirect URI: ${diagnostics.authCallbackUrl}`);
    
    // Show current localStorage for debugging
    console.log("\n💾 Storage State:");
    console.log("  LocalStorage keys:", Object.keys(localStorage));
    console.log("  SessionStorage keys:", Object.keys(sessionStorage));
    
    return diagnostics;
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session check error:", error);
          // Clear problematic session data
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
        if (session) {
          console.log("Valid session found, redirecting to app");
          navigate("/");
        } else {
          console.log("No session found, staying on auth page");
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session ? "Session exists" : "No session");
        
        if (event === 'SIGNED_IN' && session) {
          toast.success("Successfully signed in!");
          // Track user login activity (non-blocking)
          try {
            trackUserLogin();
            console.log('✅ User login tracking initiated');
          } catch (error) {
            console.warn('⚠️ User login tracking failed (non-critical):', error);
          }
          navigate("/");
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out");
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Track login activity (non-blocking)
        try {
          trackUserLogin();
          console.log('✅ User login tracking initiated (email login)');
        } catch (error) {
          console.warn('⚠️ User login tracking failed (non-critical):', error);
        }
        
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now log in.");
        setIsLogin(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Force logout and clear all local auth data
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear all storage comprehensively
      localStorage.clear();
      sessionStorage.clear();
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("Starting Google OAuth with redirect to:", `${window.location.origin}/`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account', // Force fresh consent and account selection
            hd: undefined, // Remove domain restrictions if any
          },
          skipBrowserRedirect: false,
        },
      });
      
      if (error) {
        console.error("Google OAuth error:", error);
        throw error;
      }
      
      console.log("Google OAuth initiated successfully:", data);
      
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const errorMessage = error instanceof Error ? error.message : "Google sign-in failed. Please try again.";
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card border-0">
        <CardHeader className="text-center space-y-6 pt-8">
          <div className="mx-auto w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-medium">
            <Shirt className="w-10 h-10 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">ChronoWear</CardTitle>
            <CardDescription className="text-base mt-2">Your AI Wardrobe & Styling Assistant</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-8 pb-8">
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 text-base"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 text-base"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="text-center text-sm pt-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Debug section - remove in production */}
          <div className="text-center space-y-2 pt-4 border-t border-muted">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={debugAuthEnvironment}
                className="text-xs"
              >
                🔍 Debug Info
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  toast.success("Cache cleared!");
                }}
                className="text-xs text-muted-foreground"
              >
                🧹 Clear Cache
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                const diagnostics = await debugAuthEnvironment();
                navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
                toast.success("Diagnostic info copied to clipboard!");
              }}
              className="text-xs w-full"
            >
              📋 Copy Config for Supabase
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
