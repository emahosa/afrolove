import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc, Mic, Loader2, Music, FileMusic } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import CustomSongCreation from "@/components/CustomSongCreation";
import SplitAudioControl from "@/components/SplitAudioControl";
import VoiceCloning from "@/components/VoiceCloning";
import VoiceChanger from "@/components/VoiceChanger";

const genres = [
  { id: "afrobeats", name: "Afrobeats", description: "Vibrant rhythms with West African influences" },
  { id: "rnb", name: "R&B", description: "Smooth, soulful contemporary sound" },
  { id: "pop", name: "Pop", description: "Catchy, commercial contemporary sound" },
  { id: "highlife", name: "Highlife", description: "Traditional West African musical genre" },
];

const Create = () => {
  const [activeTab, setActiveTab] = useState("vocals");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<null | { name: string }>(null);
  const { user, updateUserCredits, isAdmin } = useAuth();
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!selectedGenre) {
      toast({
        title: "Please select a genre",
        description: "Select a music genre to continue",
        variant: "destructive",
      });
      return;
    }

    if (!theme) {
      toast({
        title: "Please enter a theme",
        description: "Describe the theme or topic of your song",
        variant: "destructive",
      });
      return;
    }

    if ((user?.credits || 0) <= 0) {
      toast({
        title: "Insufficient credits",
        description: "Please purchase more credits to continue",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedTrack({ name: `${selectedGenre} ${activeTab === "vocals" ? "song" : "instrumental"} about ${theme}` });
      
      updateUserCredits(-1);
      
      toast({
        title: "Track generated!",
        description: "Your AI track has been created successfully",
      });
    }, 5000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate a new song or instrumental using AI</p>
      
      <Tabs defaultValue="vocals" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="vocals" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>AI Vocals</span>
          </TabsTrigger>
          <TabsTrigger value="instrumental" className="flex items-center gap-2">
            <Disc className="h-4 w-4" />
            <span>Instrumental</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            <span>Custom Song</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="vocals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate a song with AI vocals</CardTitle>
              <CardDescription>
                Our AI will create lyrics and vocals based on your description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!generatedTrack ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="genre" className="text-base font-medium">
                        1. Select a genre
                      </Label>
                      <RadioGroup
                        value={selectedGenre}
                        onValueChange={setSelectedGenre}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                      >
                        {genres.map((genre) => (
                          <div key={genre.id} className="space-y-1">
                            <RadioGroupItem
                              value={genre.id}
                              id={genre.id}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={genre.id}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-2">
                                <Music className="h-5 w-5" />
                              </div>
                              <div className="font-medium">{genre.name}</div>
                              <div className="text-xs text-muted-foreground text-center">
                                {genre.description}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label htmlFor="theme" className="text-base font-medium">
                        2. Describe your song
                      </Label>
                      <div className="mt-3">
                        <Input
                          id="theme"
                          placeholder="E.g., A song about falling in love on a summer evening"
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Song"
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="aspect-square max-w-sm mx-auto bg-melody-primary/30 rounded-md flex items-center justify-center">
                    <div className="audio-wave scale-150">
                      <div className="audio-wave-bar h-5 animate-wave1"></div>
                      <div className="audio-wave-bar h-8 animate-wave2"></div>
                      <div className="audio-wave-bar h-4 animate-wave3"></div>
                      <div className="audio-wave-bar h-6 animate-wave4"></div>
                      <div className="audio-wave-bar h-3 animate-wave1"></div>
                      <div className="audio-wave-bar h-7 animate-wave2"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">{generatedTrack.name}</h3>
                    <p className="text-muted-foreground mb-6">Generated with AI</p>
                    
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button>
                        <Music className="mr-2 h-4 w-4" />
                        Play
                      </Button>
                      <Button variant="outline">
                        Save to Library
                      </Button>
                      <Button variant="outline">
                        Download
                      </Button>
                      <Button variant="outline">
                        Share
                      </Button>
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-3 items-center">
                      <SplitAudioControl songName={generatedTrack.name} songUrl="mock-url" />
                      <div className="flex items-center gap-3">
                        <VoiceCloning 
                          onVoiceCloned={(voiceId) => setSelectedVoiceId(voiceId)} 
                        />
                        {selectedVoiceId && (
                          <VoiceChanger 
                            songName={generatedTrack.name} 
                            songUrl="mock-url"
                            voiceId={selectedVoiceId}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setGeneratedTrack(null);
                      setSelectedGenre("");
                      setTheme("");
                      setSelectedVoiceId(null);
                    }}
                  >
                    Create Another Song
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="instrumental" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate an instrumental track</CardTitle>
              <CardDescription>
                Our AI will create an instrumental based on your description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!generatedTrack ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="genre" className="text-base font-medium">
                        1. Select a genre
                      </Label>
                      <RadioGroup
                        value={selectedGenre}
                        onValueChange={setSelectedGenre}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                      >
                        {genres.map((genre) => (
                          <div key={genre.id} className="space-y-1">
                            <RadioGroupItem
                              value={genre.id}
                              id={`${genre.id}-inst`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`${genre.id}-inst`}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-2">
                                <Disc className="h-5 w-5" />
                              </div>
                              <div className="font-medium">{genre.name}</div>
                              <div className="text-xs text-muted-foreground text-center">
                                {genre.description}
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label htmlFor="theme-inst" className="text-base font-medium">
                        2. Describe your instrumental
                      </Label>
                      <div className="mt-3">
                        <Input
                          id="theme-inst"
                          placeholder="E.g., A relaxing beat with piano and soft drums"
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Instrumental"
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="aspect-square max-w-sm mx-auto bg-melody-primary/30 rounded-md flex items-center justify-center">
                    <div className="audio-wave scale-150">
                      <div className="audio-wave-bar h-5 animate-wave1"></div>
                      <div className="audio-wave-bar h-8 animate-wave2"></div>
                      <div className="audio-wave-bar h-4 animate-wave3"></div>
                      <div className="audio-wave-bar h-6 animate-wave4"></div>
                      <div className="audio-wave-bar h-3 animate-wave1"></div>
                      <div className="audio-wave-bar h-7 animate-wave2"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">{generatedTrack.name}</h3>
                    <p className="text-muted-foreground mb-6">Generated with AI</p>
                    
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button>
                        <Music className="mr-2 h-4 w-4" />
                        Play
                      </Button>
                      <Button variant="outline">
                        Save to Library
                      </Button>
                      <Button variant="outline">
                        Download
                      </Button>
                      <Button variant="outline">
                        Share
                      </Button>
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-3 items-center">
                      <SplitAudioControl songName={generatedTrack.name} songUrl="mock-url" />
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setGeneratedTrack(null);
                      setSelectedGenre("");
                      setTheme("");
                    }}
                  >
                    Create Another Instrumental
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6">
          <CustomSongCreation />
        </TabsContent>
      </Tabs>
      
      {isAdmin() && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">Admin Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Splitting Configuration</CardTitle>
                <CardDescription>
                  Configure the API integration for splitting vocals from instrumentals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SplitAudioControl songName="Admin Configuration" isAdmin={true} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Voice Cloning Configuration</CardTitle>
                <CardDescription>
                  Configure the ElevenLabs API for voice cloning functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceCloning isAdmin={true} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create;
