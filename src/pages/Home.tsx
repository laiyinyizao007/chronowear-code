import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Sparkles, Camera, Cloud, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Weather Card */}
      <Card className="shadow-medium">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">68°F</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Cloud className="w-4 h-4" />
                  <span className="text-sm">Partly Cloudy</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1 text-sm">
              <div className="text-muted-foreground">High: 72°F</div>
              <div className="text-muted-foreground">Low: 58°F</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Outfit Suggestion */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Today's Outfit Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6 text-center space-y-3">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Add garments to your closet to get AI-powered outfit recommendations!
            </p>
            <Button onClick={() => navigate("/closet")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Garment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
          onClick={() => navigate("/closet")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Add Garment</h3>
              <p className="text-xs text-muted-foreground">Build your wardrobe</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer"
          onClick={() => navigate("/diary")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Log OOTD</h3>
              <p className="text-xs text-muted-foreground">Save today's outfit</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
