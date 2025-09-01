
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MusicGenerationWorkflow } from "@/components/music-generation/MusicGenerationWorkflow";
import { ReproduceTrackDialog } from "@/components/reproduction/ReproduceTrackDialog";
import { Button } from "@/components/ui/button";
import { Music, Mic } from "lucide-react";

const Create = () => {
  const [reproduceDialogOpen, setReproduceDialogOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Create Music</h1>
        
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Generate AI Music
            </TabsTrigger>
            <TabsTrigger value="reproduce" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Humanize Track
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="mt-6">
            <MusicGenerationWorkflow />
          </TabsContent>
          
          <TabsContent value="reproduce" className="mt-6">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">AI Track Humanizer</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Transform your AI-generated tracks with human vocals and professional production. 
                  Work with verified producers to add authentic vocal performances and professional mixing.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="space-y-3">
                  <h3 className="font-semibold">How it works:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Select or upload your AI track</li>
                    <li>• Record your vocals live through our platform</li>
                    <li>• Choose from verified producers</li>
                    <li>• Producer humanizes your track professionally</li>
                    <li>• Receive your final mastered track</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Features:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Live vocal recording (prevents copyright issues)</li>
                    <li>• Professional mixing & mastering</li>
                    <li>• Voice conversion technology</li>
                    <li>• Secure escrow payment system</li>
                    <li>• Producer ratings & reviews</li>
                  </ul>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => setReproduceDialogOpen(true)}
                className="w-full max-w-md"
              >
                Start Reproduction Request
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <ReproduceTrackDialog
          open={reproduceDialogOpen}
          onOpenChange={setReproduceDialogOpen}
        />
      </div>
    </div>
  );
};

export default Create;
