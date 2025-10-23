/**
 * Layout Component - Main Application Shell
 * 
 * Provides the authenticated application layout including:
 * - Authentication guard and session management
 * - Bottom navigation bar
 * - Weather display
 * - AI assistant
 * - Image upload functionality
 * - Progress indicators
 * 
 * Features:
 * - Auto-redirects to /auth if not authenticated
 * - Tracks user login activity
 * - Manages weather data fetching
 * - Handles file uploads and camera capture
 * 
 * @module components/Layout
 */

import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Home, Shirt, Calendar, Settings as SettingsIcon, Sun, CloudRain, Plus, Camera, Upload, Sparkles, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AIAssistant from "./AIAssistant";
import { useWeather } from "@/hooks/useWeather";
import { useProgress } from "@/contexts/ProgressContext";
import { toast } from "sonner";
import { trackUserLogin } from "@/utils/userActivity";

/**
 * Main layout component with authentication and navigation
 * 
 * @returns Authenticated application layout
 */
export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { weather, fetchWeather } = useWeather();
  const { progress, isProcessing, startFakeProgress, doneProgress } = useProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Initialize authentication and set up session listeners
   * 
   * - Checks for existing session on mount
   * - Redirects to /auth if no valid session
   * - Tracks user login activity (non-blocking)
   * - Sets up auth state change listener
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("Layout: Checking initial session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Layout: Session error:", error);
          navigate("/auth");
          return;
        }

        console.log("Layout: Session check result:", session ? "Session found" : "No session");
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          console.log("Layout: No user session, redirecting to auth");
          navigate("/auth");
        } else {
          console.log("Layout: User authenticated:", session.user.email);
          
          // Track user login activity (non-blocking, non-critical)
          try {
            trackUserLogin();
            console.log('✅ User session tracking initiated');
          } catch (error) {
            console.warn('⚠️ User session tracking failed (non-critical):', error);
          }
        }
      } catch (error) {
        console.error("Layout: Auth initialization error:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Layout: Auth state changed:", event, session ? "Session exists" : "No session");
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user && event !== 'INITIAL_SESSION') {
        console.log("Layout: No user in auth change, redirecting to auth");
        navigate("/auth");
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Track user login activity on sign in or token refresh (non-blocking)
        console.log("Layout: Tracking login activity for event:", event);
        try {
          trackUserLogin();
          console.log('✅ User activity tracking initiated for event:', event);
        } catch (error) {
          console.warn('⚠️ User activity tracking failed (non-critical):', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchWeather().catch(error => {
        console.error('Failed to load weather:', error);
      });
    }
  }, [user, fetchWeather]);

  // Compute and expose bottom offset for toasts based on actual nav height
  useEffect(() => {
    const updateBottomOffset = () => {
      const nav = document.querySelector('[data-app-bottom-nav]') as HTMLElement | null;
      const h = nav?.offsetHeight ?? 0;
      const gap = 24; // extra breathing room above the nav
      document.documentElement.style.setProperty('--app-bottom-offset', `${h + gap}px`);
    };
    updateBottomOffset();
    window.addEventListener('resize', updateBottomOffset);
    window.addEventListener('orientationchange', updateBottomOffset);
    return () => {
      window.removeEventListener('resize', updateBottomOffset);
      window.removeEventListener('orientationchange', updateBottomOffset);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddGarmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 启动进度条（预计5秒完成）
    startFakeProgress(5000);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("garments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("garments")
        .getPublicUrl(fileName);

      navigate(`/closet?action=add&imageUrl=${encodeURIComponent(publicUrl)}`);
    } catch (error: unknown) {
      doneProgress();
      toast.error("Failed to upload image");
    }

    // Reset input
    event.target.value = '';
  };

  if (!user) return null;

  const navItems = [
    { to: "/diary", icon: Calendar, label: "OOTD" },
    { to: "/stylist", icon: Sparkles, label: "Stylist" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for Add Garment */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Top Header - Farfetch minimal black/white */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto px-6 sm:px-10 h-14 sm:h-16 flex items-center justify-between max-w-[1600px]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary flex items-center justify-center">
              <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm sm:text-base font-display font-light tracking-[0.2em] uppercase">ChronoWear</h1>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Weather - Ultra minimal */}
            {weather && (
              <div className="hidden md:flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                <div className="flex items-center gap-2">
                  {weather.current.weatherDescription.toLowerCase().includes('rain') ? (
                    <CloudRain className="w-3 h-3" />
                  ) : (
                    <Sun className="w-3 h-3" />
                  )}
                  <span className="font-light">{weather.current.temperature}°</span>
                </div>
              </div>
            )}
            
            {/* AI Assistant */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-muted/30 h-8 w-8"
                  aria-label="AI Assistant"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display font-light tracking-[0.15em] uppercase text-sm">AI Fashion Assistant</DialogTitle>
                </DialogHeader>
                <AIAssistant />
              </DialogContent>
            </Dialog>
            
            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/settings")}
              className="hover:bg-muted/30 h-8 w-8"
              aria-label="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto py-8 sm:py-12 pb-28 sm:pb-32 max-w-[1600px] px-6 sm:px-10">
        <Outlet />
      </main>

      {/* Bottom Navigation - Farfetch ultra minimal */}
      <nav data-app-bottom-nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 safe-bottom">
        <div className="mx-auto px-4 sm:px-6 max-w-[1600px]">
          <div className="flex justify-around items-center h-16 sm:h-18">
            {/* First nav item: OOTD */}
            {navItems.slice(0, 1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-2 sm:px-3 py-2 transition-all duration-300 relative ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary animate-fade-in" />
                    )}
                    <item.icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2 : 1.5} />
                    <span className={`text-[8px] sm:text-[9px] font-light tracking-[0.15em] uppercase transition-all duration-300 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            
            {/* CTA Button - Add Menu or Progress in the middle */}
            {isProcessing ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center -mt-8 border-2 border-background shadow-medium">
                <div className="w-10 h-10 sm:w-12 sm:h-12 relative">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-primary transition-all duration-300"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-primary">{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-medium hover:shadow-large transition-all duration-300 -mt-8 border-2 border-background"
                    aria-label="Add"
                  >
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="mb-2 bg-background border-border/50 rounded-none shadow-medium">
                  <DropdownMenuItem 
                    onClick={handleAddGarmentClick}
                    className="cursor-pointer py-3 px-4 focus:bg-muted/50 focus:text-foreground"
                  >
                    <Upload className="w-4 h-4 mr-3 stroke-[1.5]" strokeWidth={1.5} />
                    <span className="text-sm font-light tracking-wide">Add Garment</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/diary?action=add")}
                    className="cursor-pointer py-3 px-4 focus:bg-muted/50 focus:text-foreground"
                  >
                    <Camera className="w-4 h-4 mr-3 stroke-[1.5]" strokeWidth={1.5} />
                    <span className="text-sm font-light tracking-wide">Log OOTD</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Last nav item: Stylist */}
            {navItems.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-2 sm:px-3 py-2 transition-all duration-300 relative ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary animate-fade-in" />
                    )}
                    <item.icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2 : 1.5} />
                    <span className={`text-[8px] sm:text-[9px] font-light tracking-[0.15em] uppercase transition-all duration-300 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
