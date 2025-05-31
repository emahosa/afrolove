import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disc, Mic, Loader2, Music, FileMusic, Plus, History } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import CustomSongCreation from "@/components/CustomSongCreation";
import SplitAudioControl from "@/components/SplitAudioControl";
import VoiceCloning from "@/components/VoiceCloning";
import VoiceChanger from "@/components/VoiceChanger";
import { CreateSongRequestDialog } from "@/components/song-management/CreateSongRequestDialog";
import { SunoGenerationForm } from "@/components/suno/SunoGenerationForm";
import { useNavigate } from "react-router-dom";
import { useGenres } from "@/hooks/use-genres";

const Create = () => {
  const [activeTab, setActiveTab] = useState("ai-suno");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<null | { name: string }>(null);
  const { user, updateUserCredits, isAdmin } = useAuth();
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();
  const { genres, loading: genresLoading } = useGenres();

  const handleLegacyGenerate = () => {
    const selectedGenreData = genres.find(g => g.id === selectedGenre);
    
    if (!selectedGenreData) {
      toast.error("Please select a genre. Select a music genre to continue");
      return;
    }

    if (!theme) {
      toast.error("Please enter a theme. Describe the theme or topic of your song");
      return;
    }

    if (theme.length > 90) {
      toast.error("Song description must be 90 characters or less");
      return;
    }

    if ((user?.credits || 0) <= 0) {
      toast.error("Insufficient credits. Please purchase more credits to continue");
      return;
    }

    const combinedPrompt = `${selectedGenreData.prompt_template}. ${theme}`;
    console.log('Combined prompt for AI generation:', combinedPrompt);

    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedTrack({ 
        name: `${selectedGenreData.name} ${activeTab === "vocals" ? "song" : "instrumental"} about ${theme}` 
      });
      
      updateUserCredits(-1);
      
      toast.success("Track generated! Your AI track has been created successfully");
    }, 5000);
  };

  const handleSunoSuccess = (taskId: string) => {
    console.log('Suno generation started with task ID:', taskId);
    toast.success('🎵 Your song is being generated! Check back in a few minutes.');
  };

  const handleViewHistory = () => {
    navigate("/custom-songs-management");
  };

  if (genresLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading genres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate high-quality songs using AI technology</p>
      
      <Tabs defaultValue="ai-suno" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="ai-suno" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span>Suno AI</span>
          </TabsTrigger>
          <TabsTrigger value="vocals" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Legacy AI</span>
          </TabsTrigger>
          <TabsTrigger value="instrumental" className="flex items-center gap-2">
            <Disc className="h-4 w-4" />
            <span>Instrumental</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            <span>Custom</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai-suno" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🎵 Suno AI Music Generation</CardTitle>
              <CardDescription>
                Create professional-quality songs with advanced AI. Choose between quick prompts or detailed lyrics input.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SunoGenerationForm onSuccess={handleSunoSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vocals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate a song with AI vocals (Legacy)</CardTitle>
              <CardDescription>
                Basic AI song generation with simple prompts
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
                      {genres.length === 0 ? (
                        <div className="text-center py-8">
                          <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No genres available</p>
                        </div>
                      ) : (
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
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-yellow-400 peer-data-[state=checked]:bg-yellow-100 peer-data-[state=checked]:text-yellow-900 [&:has([data-state=checked])]:border-yellow-400 [&:has([data-state=checked])]:bg-yellow-100 [&:has([data-state=checked])]:text-yellow-900 cursor-pointer transition-all duration-200 hover:scale-105"
                              >
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted peer-data-[state=checked]:bg-yellow-200 mb-2 transition-colors duration-200">
                                  <Music className="h-5 w-5 peer-data-[state=checked]:text-yellow-900" />
                                </div>
                                <div className="font-medium">{genre.name}</div>
                                <div className="text-xs text-muted-foreground peer-data-[state=checked]:text-yellow-800 text-center">
                                  {genre.description}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="theme" className="text-base font-medium">
                        2. Describe your song (max 90 characters)
                      </Label>
                      <div className="mt-3">
                        <Input
                          id="theme"
                          placeholder="E.g., A song about falling in love on a summer evening"
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          maxLength={90}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {theme.length}/90 characters
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleLegacyGenerate}
                    disabled={isGenerating || genres.length === 0}
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
                      <Label htmlFor="genre-inst" className="text-base font-medium">
                        1. Select a genre
                      </Label>
                      {genres.length === 0 ? (
                        <div className="text-center py-8">
                          <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No genres available</p>
                        </div>
                      ) : (
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
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-yellow-400 peer-data-[state=checked]:bg-yellow-100 peer-data-[state=checked]:text-yellow-900 [&:has([data-state=checked])]:border-yellow-400 [&:has([data-state=checked])]:bg-yellow-100 [&:has([data-state=checked])]:text-yellow-900 cursor-pointer transition-all duration-200 hover:scale-105"
                              >
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted peer-data-[state=checked]:bg-yellow-200 mb-2 transition-colors duration-200">
                                  <Disc className="h-5 w-5 peer-data-[state=checked]:text-yellow-900" />
                                </div>
                                <div className="font-medium">{genre.name}</div>
                                <div className="text-xs text-muted-foreground peer-data-[state=checked]:text-yellow-800 text-center">
                                  {genre.description}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="theme-inst" className="text-base font-medium">
                        2. Describe your instrumental (max 90 characters)
                      </Label>
                      <div className="mt-3">
                        <Input
                          id="theme-inst"
                          placeholder="E.g., A relaxing beat with piano and soft drums"
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          maxLength={90}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {theme.length}/90 characters
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleLegacyGenerate}
                    disabled={isGenerating || genres.length === 0}
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
          <Card>
            <CardHeader>
              <CardTitle>Custom Song Requests</CardTitle>
              <CardDescription>
                Request custom songs from our team. Get personalized lyrics and professional audio production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-melody-primary hover:bg-melody-primary/90"
                >
                  <Plus className="h-6 w-6" />
                  <span>Create New Request</span>
                </Button>
                
                <Button
                  onClick={handleViewHistory}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <History className="h-6 w-6" />
                  <span>View History</span>
                </Button>
              </div>
              
              <div className="mt-6">
                <CustomSongCreation />
              </div>
            </CardContent>
          </Card>
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
      
      <CreateSongRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          toast.success("Custom song request created successfully!");
        }}
      />
    </div>
  );
};

export default Create;
