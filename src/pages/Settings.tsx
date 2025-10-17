import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Upload, Loader2, Image as ImageIcon, LogOut, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LocationCombobox } from "@/components/LocationCombobox";

export default function Settings() {
  const navigate = useNavigate();
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState<string>("");
  const [stylePreference, setStylePreference] = useState<string>("");
  const [geoLocation, setGeoLocation] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [bust, setBust] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [hip, setHip] = useState<string>("");
  const [clothingSize, setClothingSize] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .select("style_preference, geo_location, height_cm, weight_kg, bust_cm, waist_cm, hip_cm, clothing_size")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setStylePreference(profileData.style_preference || "");
        setGeoLocation(profileData.geo_location || "");
        setHeight(profileData.height_cm?.toString() || "");
        setWeight(profileData.weight_kg?.toString() || "");
        setBust(profileData.bust_cm?.toString() || "");
        setWaist(profileData.waist_cm?.toString() || "");
        setHip(profileData.hip_cm?.toString() || "");
        setClothingSize(profileData.clothing_size || "");
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

  const handleUpdateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          style_preference: stylePreference,
          geo_location: geoLocation,
          height_cm: height ? parseFloat(height) : null,
          weight_kg: weight ? parseFloat(weight) : null,
          bust_cm: bust ? parseFloat(bust) : null,
          waist_cm: waist ? parseFloat(waist) : null,
          hip_cm: hip ? parseFloat(hip) : null,
          clothing_size: clothingSize || null,
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
            <LocationCombobox value={geoLocation} onChange={setGeoLocation} />
          </div>

          <Button onClick={handleUpdateProfile} className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Body Measurements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add your measurements for more accurate outfit recommendations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="60"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clothing-size">Clothing Size</Label>
            <Select value={clothingSize} onValueChange={setClothingSize}>
              <SelectTrigger id="clothing-size">
                <SelectValue placeholder="Select your size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xxs">XXS</SelectItem>
                <SelectItem value="xs">XS</SelectItem>
                <SelectItem value="s">S</SelectItem>
                <SelectItem value="m">M</SelectItem>
                <SelectItem value="l">L</SelectItem>
                <SelectItem value="xl">XL</SelectItem>
                <SelectItem value="xxl">XXL</SelectItem>
                <SelectItem value="xxxl">XXXL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Body Measurements (cm)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bust" className="text-xs text-muted-foreground">Bust</Label>
                <Input
                  id="bust"
                  type="number"
                  placeholder="85"
                  value={bust}
                  onChange={(e) => setBust(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waist" className="text-xs text-muted-foreground">Waist</Label>
                <Input
                  id="waist"
                  type="number"
                  placeholder="65"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hip" className="text-xs text-muted-foreground">Hip</Label>
                <Input
                  id="hip"
                  type="number"
                  placeholder="90"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleUpdateProfile} className="w-full">
            Save Measurements
          </Button>
        </CardContent>
      </Card>

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

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}