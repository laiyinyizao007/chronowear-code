import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Upload, Loader2, Image as ImageIcon, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState<string>("");
  const [stylePreference, setStylePreference] = useState<string>("");
  const [geoLocation, setGeoLocation] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Body measurements
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [bustCm, setBustCm] = useState<string>("");
  const [waistCm, setWaistCm] = useState<string>("");
  const [hipCm, setHipCm] = useState<string>("");
  const [braCup, setBraCup] = useState<string>("");
  const [shoeSize, setShoeSize] = useState<string>("");
  const [eyeColor, setEyeColor] = useState<string>("");
  const [hairColor, setHairColor] = useState<string>("");
  
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      // Load user settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("user_settings")
        .select("full_body_photo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData?.full_body_photo_url) {
        setFullBodyPhotoUrl(settingsData.full_body_photo_url);
      }

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("style_preference, geo_location, height_cm, weight_kg, bust_cm, waist_cm, hip_cm, bra_cup, shoe_size, eye_color, hair_color")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setStylePreference(profileData.style_preference || "");
        setGeoLocation(profileData.geo_location || "");
        setLocationSearch(profileData.geo_location || "");
        setHeightCm(profileData.height_cm?.toString() || "");
        setWeightKg(profileData.weight_kg?.toString() || "");
        setBustCm(profileData.bust_cm?.toString() || "");
        setWaistCm(profileData.waist_cm?.toString() || "");
        setHipCm(profileData.hip_cm?.toString() || "");
        setBraCup(profileData.bra_cup || "");
        setShoeSize(profileData.shoe_size?.toString() || "");
        setEyeColor(profileData.eye_color || "");
        setHairColor(profileData.hair_color || "");
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/full-body-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      // Save to database
      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          full_body_photo_url: publicUrl,
        }, {
          onConflict: "user_id"
        });

      if (upsertError) throw upsertError;

      setFullBodyPhotoUrl(publicUrl);
      toast.success("Full body photo uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleLocationSearch = (value: string) => {
    setLocationSearch(value);
    if (value.length > 2) {
      // Common cities for suggestions
      const cities = [
        "Tokyo, Japan", "New York, USA", "London, UK", "Paris, France", 
        "Seoul, South Korea", "Shanghai, China", "Hong Kong", "Singapore",
        "Los Angeles, USA", "San Francisco, USA", "Chicago, USA", "Miami, USA",
        "Berlin, Germany", "Madrid, Spain", "Rome, Italy", "Milan, Italy",
        "Sydney, Australia", "Melbourne, Australia", "Toronto, Canada", "Vancouver, Canada",
        "Dubai, UAE", "Bangkok, Thailand", "Taipei, Taiwan", "Beijing, China"
      ];
      const filtered = cities.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      );
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const selectLocation = (location: string) => {
    setGeoLocation(location);
    setLocationSearch(location);
    setShowLocationSuggestions(false);
  };

  const handleUpdateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          style_preference: stylePreference,
          geo_location: geoLocation,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          bust_cm: bustCm ? parseFloat(bustCm) : null,
          waist_cm: waistCm ? parseFloat(waistCm) : null,
          hip_cm: hipCm ? parseFloat(hipCm) : null,
          bra_cup: braCup || null,
          shoe_size: shoeSize ? parseFloat(shoeSize) : null,
          eye_color: eyeColor || null,
          hair_color: hairColor || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile and virtual try-on preferences
        </p>
      </div>

      <Tabs defaultValue="style" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Personal Style</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tell us about your style preferences for better outfit recommendations
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="style-preference">Style Preference</Label>
                <Select value={stylePreference} onValueChange={setStylePreference}>
                  <SelectTrigger id="style-preference">
                    <SelectValue placeholder="Select your style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="street">Street Style</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="bohemian">Bohemian</SelectItem>
                    <SelectItem value="sporty">Sporty</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="elegant">Elegant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="geo-location">Preferred Location</Label>
                <div className="relative">
                  <Input
                    id="geo-location"
                    placeholder="Search for a city..."
                    value={locationSearch}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {locationSuggestions.map((location) => (
                        <button
                          key={location}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          onClick={() => selectLocation(location)}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This helps us provide location-specific outfit recommendations
                </p>
              </div>

              <Button onClick={handleUpdateProfile} className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Body Measurements</CardTitle>
              <p className="text-sm text-muted-foreground">
                Provide your measurements for personalized size recommendations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="165"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="55"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Body Measurements</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bust">Bust (cm)</Label>
                    <Input
                      id="bust"
                      type="number"
                      placeholder="85"
                      value={bustCm}
                      onChange={(e) => setBustCm(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="waist">Waist (cm)</Label>
                    <Input
                      id="waist"
                      type="number"
                      placeholder="65"
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hip">Hip (cm)</Label>
                    <Input
                      id="hip"
                      type="number"
                      placeholder="90"
                      value={hipCm}
                      onChange={(e) => setHipCm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bra-cup">Bra Cup Size</Label>
                  <Select value={braCup} onValueChange={setBraCup}>
                    <SelectTrigger id="bra-cup">
                      <SelectValue placeholder="Select cup size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="DD">DD</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shoe-size">Shoe Size (EU)</Label>
                  <Input
                    id="shoe-size"
                    type="number"
                    step="0.5"
                    placeholder="38"
                    value={shoeSize}
                    onChange={(e) => setShoeSize(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Physical Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eye-color">Eye Color</Label>
                    <Select value={eyeColor} onValueChange={setEyeColor}>
                      <SelectTrigger id="eye-color">
                        <SelectValue placeholder="Select eye color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="hazel">Hazel</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="amber">Amber</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hair-color">Hair Color</Label>
                    <Select value={hairColor} onValueChange={setHairColor}>
                      <SelectTrigger id="hair-color">
                        <SelectValue placeholder="Select hair color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="dark-brown">Dark Brown</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="light-brown">Light Brown</SelectItem>
                        <SelectItem value="blonde">Blonde</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                        <SelectItem value="auburn">Auburn</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="other">Other/Dyed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleUpdateProfile} className="w-full">
                Save Measurements
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your account details and settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{userEmail}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Virtual Try-On Photo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a full-body photo to see outfit recommendations on yourself
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {fullBodyPhotoUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] w-full max-w-xs mx-auto bg-muted rounded-lg overflow-hidden">
                <img
                  src={fullBodyPhotoUrl}
                  alt="Full body photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Your current full-body photo
              </p>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No photo uploaded yet
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <label htmlFor="photo-upload">
              <Button
                variant={fullBodyPhotoUrl ? "outline" : "default"}
                disabled={uploading}
                asChild
              >
                <span className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {fullBodyPhotoUrl ? "Change Photo" : "Upload Photo"}
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1 text-center">
            <p>• Upload a clear, full-body photo in good lighting</p>
            <p>• Stand straight facing the camera</p>
            <p>• Wear form-fitting clothes for best results</p>
            <p>• Maximum file size: 5MB</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}