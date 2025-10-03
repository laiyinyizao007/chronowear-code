import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Stylist() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Stylist</h1>
        <p className="text-muted-foreground">Virtual try-on & styling magic</p>
      </div>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            AI Virtual Try-On
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-12 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-accent rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-accent-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">AI Try-On Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Upload your photo and let AI show you how different outfits look on you. This feature will be powered by advanced image generation AI.
              </p>
            </div>
            <Button disabled>
              <Sparkles className="w-4 h-4 mr-2" />
              Try On Outfits (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Outfit Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-8 text-center space-y-3">
            <p className="text-muted-foreground">
              Add more garments to get AI-powered outfit recommendations based on weather and occasion
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
