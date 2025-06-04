import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, FileMusic, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import CustomSongCreation from "@/components/CustomSongCreation";
import { CreateSongRequestDialog } from "@/components/song-management/CreateSongRequestDialog";
import { useSunoGeneration } from "@/hooks/use-suno-generation";
import { useGenres } from "@/hooks/use-genres";

type CreationMode = 'prompt' | 'lyrics';

const Create = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [creationMode, setCreationMode] = useState<CreationMode>("prompt");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { user } = useAuth();
  const { generateSong, isGenerating } = useSunoGeneration();
  const { genres, loading: genresLoading } = useGenres();

  const getMaxUserPromptLength = () => {
    // User prompt is limited to 99 characters (199 total - 100 max for admin genre template)
    return 99;
  };

  const handleGenerate = async () => {
    if (!selectedGenre) {
      toast.error("Please select a genre");
      return;
    }

    if (!userPrompt.trim()) {
      toast.error(`Please enter ${creationMode === 'prompt' ? 'a prompt' : 'lyrics'}`);
      return;
    }

    if (creationMode === 'lyrics' && !songTitle.trim()) {
      toast.error("Please enter a song title for lyrics mode");
      return;
    }

    const selectedGenreData = genres.find(g => g.id === selectedGenre);
    if (!selectedGenreData) {
      toast.error("Invalid genre selected");
      return;
    }

    // Combine admin genre prompt with user prompt
    const combinedPrompt = `${selectedGenreData.prompt_template}. ${userPrompt}`;
    
    if (combinedPrompt.length > 199) {
      toast.error(`Combined prompt is too long (${combinedPrompt.length}/199 characters). Please shorten your input.`);
      return;
    }

    if ((user?.credits || 0) <= 0) {
      toast.error("Insufficient credits. Please purchase more credits to continue");
      return;
    }

    const request = {
      prompt: combinedPrompt,
      instrumental,
      customMode: creationMode === 'lyrics',
      model: 'V4_5' as const,
      ...(creationMode === 'lyrics' && {
        title: songTitle,
        style: selectedGenreData.name
      })
    };

    const taskId = await generateSong(request);
    if (taskId) {
      toast.success('🎵 Your song is being generated! Check your library in a few minutes.');
      // Reset form
      setUserPrompt("");
      setSongTitle("");
      setSelectedGenre("");
    }
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
      
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span>Create Song</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            <span>Custom Song</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🎵 AI Song Generation</CardTitle>
              <CardDescription>
                Create professional-quality songs with advanced AI. Choose between quick prompts or detailed lyrics input.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Creation Mode Toggle */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Creation Mode</Label>
                <RadioGroup 
                  value={creationMode} 
                  onValueChange={(value) => {
                    setCreationMode(value as CreationMode);
                    setUserPrompt("");
                    setSongTitle("");
                  }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <RadioGroupItem value="prompt" id="prompt" className="peer sr-only" />
                    <Label
                      htmlFor="prompt"
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <div className="font-medium">🎨 Prompt Mode</div>
                      <div className="text-xs text-muted-foreground text-center">
                        Describe your song idea
                      </div>
                    </Label>
                  </div>
                  
                  <div className="space-y-1">
                    <RadioGroupItem value="lyrics" id="lyrics" className="peer sr-only" />
                    <Label
                      htmlFor="lyrics"
                      className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <div className="font-medium">✍️ Lyrics Mode</div>
                      <div className="text-xs text-muted-foreground text-center">
                        Input full song lyrics
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Genre Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Select Genre</Label>
                {genres.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No genres available</p>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedGenre}
                    onValueChange={setSelectedGenre}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
                          className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <div className="font-medium">{genre.name}</div>
                          {genre.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {genre.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Song Title (for lyrics mode) */}
              {creationMode === 'lyrics' && (
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-medium">
                    Song Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter song title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    maxLength={80}
                  />
                </div>
              )}

              {/* User Prompt/Lyrics Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="userPrompt" className="text-base font-medium">
                    {creationMode === 'prompt' ? 'Your Song Description' : 'Your Lyrics'}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Max: {getMaxUserPromptLength()} chars
                  </span>
                </div>
                <Textarea
                  id="userPrompt"
                  placeholder={
                    creationMode === 'prompt' 
                      ? "e.g., about falling in love on a summer evening..." 
                      : "Paste your full song lyrics here..."
                  }
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  maxLength={getMaxUserPromptLength()}
                  className="min-h-[120px]"
                />
                <div className="flex justify-between text-sm">
                  <span className={userPrompt.length > getMaxUserPromptLength() ? 'text-red-500' : 'text-muted-foreground'}>
                    {userPrompt.length}/{getMaxUserPromptLength()} characters
                  </span>
                </div>
              </div>

              {/* Instrumental Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="instrumental"
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                />
                <Label htmlFor="instrumental">Generate instrumental only (no vocals)</Label>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedGenre || !userPrompt.trim() || (creationMode === 'lyrics' && !songTitle.trim())}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Song...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Generate Song (5 Credits)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Generation typically takes 1-2 minutes. You'll be notified when it's ready.
              </p>
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
                  <Music className="h-6 w-6" />
                  <span>Create New Request</span>
                </Button>
                
                <Button
                  onClick={() => window.location.href = "/custom-songs-management"}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <FileMusic className="h-6 w-6" />
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
