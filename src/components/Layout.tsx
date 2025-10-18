import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Home, Shirt, Sparkles, Calendar, Settings as SettingsIcon, Sun, CloudRain } from "lucide-react";

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
      {/* Top Header - LV-inspired luxury design */}
      <header className="sticky top-0 z-50 bg-card/98 backdrop-blur-md border-b border-border/40">
        <div className="mx-auto px-6 sm:px-8 h-14 sm:h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-sm flex items-center justify-center">
              <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg sm:text-xl font-serif tracking-wider uppercase">ChronoWear</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Weather - Hidden on small screens */}
            {weather && (
              <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  {weather.current.weatherDescription.toLowerCase().includes('rain') ? (
                    <CloudRain className="w-3.5 h-3.5" />
                  ) : (
                    <Sun className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">{weather.current.temperature}°F</span>
                </div>
                <span className="text-xs opacity-70">{weather.current.weatherDescription}</span>
              </div>
            )}
            
            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/settings")}
              className="hidden sm:flex hover:bg-muted/50 h-9 w-9 rounded-sm"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto py-6 sm:py-10 pb-24 sm:pb-28 max-w-7xl px-6 sm:px-8">
        <Outlet />
      </main>

      {/* Bottom Navigation - LV luxury minimal */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-md border-t border-border/30 z-50 safe-bottom">
        <div className="mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex justify-around items-center h-16 sm:h-18">
            {navItems.slice(0, 2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 sm:px-6 py-2 transition-all duration-300 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-all ${isActive ? 'scale-105' : ''}`} />
                    <span className="text-[9px] sm:text-[10px] font-medium tracking-widest uppercase">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            
            {/* CTA Button - Luxe floating accent */}
            <Button
              onClick={() => navigate("/stylist")}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-accent shadow-gold hover:shadow-gold hover:scale-105 transition-all duration-300 -mt-8 border-4 border-background"
              aria-label="AI Stylist"
            >
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </Button>
            
            {navItems.slice(2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 sm:px-6 py-2 transition-all duration-300 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-all ${isActive ? 'scale-105' : ''}`} />
                    <span className="text-[9px] sm:text-[10px] font-medium tracking-widest uppercase">{item.label}</span>
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
