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
      {/* Top Header - Clean minimal design */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-accent rounded-xl flex items-center justify-center">
              <Shirt className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ChronoWear</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Weather - Hidden on small screens */}
            {weather && (
              <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {weather.current.weatherDescription.toLowerCase().includes('rain') ? (
                    <CloudRain className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                  <span>{weather.current.temperature}°F</span>
                </div>
                <span className="text-xs">{weather.current.weatherDescription}</span>
                <div className="flex items-center gap-1">
                  <Sun className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs">UV {weather.current.uvIndex}</span>
                </div>
              </div>
            )}
            
            {/* Settings - Hidden on small screens */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/settings")}
              className="hidden sm:flex hover:bg-muted h-10 w-10"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation - Minimal with accent highlights */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 z-50 safe-bottom">
        <div className="container mx-auto px-2 sm:px-6">
          <div className="flex justify-around items-center h-16 sm:h-20">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "text-foreground bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    <span className="text-[10px] sm:text-xs font-medium tracking-wide">{item.label}</span>
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
