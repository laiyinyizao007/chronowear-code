import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Home, Shirt, Calendar, Settings as SettingsIcon, Sun, CloudRain, Plus, Camera, Upload, Sparkles, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AIAssistant from "./AIAssistant";

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    weatherDescription: string;
    uvIndex: number;
  };
}

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });

        const { latitude, longitude } = position.coords;
        const { data: weatherData } = await supabase.functions.invoke('get-weather', {
          body: { lat: latitude, lng: longitude }
        });

        if (weatherData) setWeather(weatherData);
      } catch (error) {
        console.error('Failed to load weather:', error);
      }
    };

    if (user) loadWeather();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/closet", icon: Shirt, label: "Closet" },
    { to: "/stylist", icon: Sparkles, label: "Stylist" },
    { to: "/diary", icon: Calendar, label: "OOTD" },
  ];

  return (
    <div className="min-h-screen bg-background">
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
              className="hidden sm:flex hover:bg-muted/30 h-8 w-8"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 safe-bottom">
        <div className="mx-auto px-6 sm:px-10 max-w-[1600px]">
          <div className="flex justify-around items-center h-16 sm:h-18">
            {/* First two nav items: Home, Closet */}
            {navItems.slice(0, 2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2.5 transition-all duration-300 relative ${
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
                    <item.icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2 : 1.5} />
                    <span className={`text-[8px] sm:text-[9px] font-light tracking-[0.15em] uppercase transition-all duration-300 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            
            {/* CTA Button - Add Menu in the middle */}
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
                  onClick={() => navigate("/closet?action=add")}
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
            
            {/* Last two nav items: Stylist, OOTD */}
            {navItems.slice(2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 px-3 sm:px-4 py-2.5 transition-all duration-300 relative ${
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
                    <item.icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2 : 1.5} />
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
