
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Music, FileMusic } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Mock genre data
const genres = [
  { id: "afrobeats", name: "Afrobeats", description: "Vibrant rhythms with West African influences" },
  { id: "rnb", name: "R&B", description: "Smooth, soulful contemporary sound" },
  { id: "pop", name: "Pop", description: "Catchy, commercial contemporary sound" },
  { id: "highlife", name: "Highlife", description: "Traditional West African musical genre" },
];

// Custom song creation states
type CreationStep = 'initial' | 'waiting' | 'lyrics' | 'rhythm' | 'final';

interface SongOption {
  id: string;
  title: string;
  preview: string;
}

const CustomSongCreation = () => {
  const [step, setStep] = useState<CreationStep>('initial');
  const [selectedGenre, setSelectedGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLyric, setSelectedLyric] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState<number>(2);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const { user, updateUserCredits } = useAuth();
  const navigate = useNavigate();

  // Mock lyric options
  const lyricOptions: SongOption[] = [
    {
      id: "lyric1",
      title: "Sunset Love",
      preview: "Verse 1: The sun sets low on the horizon...\nChorus: Your love is my warm sunset glow...",
    },
    {
      id: "lyric2",
      title: "Evening Romance",
      preview: "Verse 1: In the quiet of the evening light...\nChorus: Under stars our love takes flight...",
    },
  ];

  // Mock instrumental options
  const instrumentalOptions: SongOption[] = [
    {
      id: "inst1",
      title: "Sunset Love - Smooth Mix",
      preview: "Smooth R&B instrumental with piano and gentle beats",
    },
    {
      id: "inst2",
      title: "Sunset Love - Upbeat Mix",
      preview: "Upbeat version with stronger drums and melodic synths",
    },
  ];

  const handleInitialSubmit = () => {
    if (!selectedGenre) {
      toast({
        title: "Please select a genre",
        description: "Select a music genre to continue",
        variant: "destructive",
      });
      return;
    }

    if (!description) {
      toast({
        title: "Please enter a description",
        description: "Describe your song in detail to help our team create it",
        variant: "destructive",
      });
      return;
    }

    if ((user?.credits || 0) < 100) {
      toast({
        title: "Insufficient credits",
        description: "You need 100 credits to request a custom song",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Deduct 100 credits for initial custom song request
    updateUserCredits(-100);
    
    // Simulate submission to admin
    setTimeout(() => {
      setIsGenerating(false);
      setStep('waiting');
      
      toast({
        title: "Request submitted!",
        description: "Our team is now working on your custom song lyrics",
      });
      
      // Simulate admin response after 5 seconds (in real app this would come from backend)
      setTimeout(() => {
        setStep('lyrics');
      }, 5000);
    }, 2000);
  };

  const handleLyricSelection = (lyricId: string) => {
    setSelectedLyric(lyricId);
  };

  const handleLyricSubmit = () => {
    if (!selectedLyric) {
      toast({
        title: "Please select a lyric option",
        description: "Choose one of the lyric options to continue",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate submission for instrumental creation
    setTimeout(() => {
      setIsGenerating(false);
      setStep('rhythm');
      
      toast({
        title: "Lyrics approved!",
        description: "Our team is now working on your instrumental options",
      });
    }, 2000);
  };

  const handleVersionCountChange = (count: number) => {
    setVersionCount(count);
  };

  const handleInstrumentalSubmit = () => {
    if (!selectedVersion) {
      toast({
        title: "Please select a version",
        description: "Choose one of the instrumental options to continue",
        variant: "destructive",
      });
      return;
    }

    // Calculate additional credits needed (20 credits per 2 versions beyond the first 2)
    const additionalVersions = Math.max(0, versionCount - 2);
    const additionalCreditsNeeded = Math.floor(additionalVersions / 2) * 20;
    
    if ((user?.credits || 0) < additionalCreditsNeeded) {
      toast({
        title: "Insufficient credits",
        description: `You need ${additionalCreditsNeeded} more credits for ${versionCount} versions`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Deduct additional credits if needed
    if (additionalCreditsNeeded > 0) {
      updateUserCredits(-additionalCreditsNeeded);
    }
    
    // Simulate final song creation
    setTimeout(() => {
      setIsGenerating(false);
      setStep('final');
      
      toast({
        title: "Custom song created!",
        description: "Your custom song has been successfully created",
      });
    }, 3000);
  };

  const handleSaveToLibrary = () => {
    toast({
      title: "Song saved!",
      description: "Your custom song has been saved to your library",
    });
    navigate("/library");
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: "Your custom song is being downloaded",
    });
  };

  const handleShare = () => {
    toast({
      title: "Sharing options",
      description: "Share link copied to clipboard",
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 'initial':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Create a Custom Song</CardTitle>
              <CardDescription>
                Work with our team to create a personalized song with professional quality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="genre-custom" className="text-base font-medium">
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
                          id={`${genre.id}-custom`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`${genre.id}-custom`}
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
                  <Label htmlFor="description" className="text-base font-medium">
                    2. Describe your song in detail
                  </Label>
                  <div className="mt-3">
                    <Textarea
                      id="description"
                      placeholder="Describe the theme, mood, lyrics ideas, and any specific elements you want in your song"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                  <div className="flex items-center">
                    <FileMusic className="h-5 w-5 text-amber-500 mr-2" />
                    <h3 className="text-sm font-medium text-amber-800">Custom Song Creation</h3>
                  </div>
                  <p className="text-sm text-amber-700 mt-2">
                    This will use 100 credits to start the process. Our team will create custom lyrics for you to review, 
                    then you can select how many instrumental versions you want (additional 20 credits per 2 versions beyond the first 2).
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleInitialSubmit}
                disabled={isGenerating}
                className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  "Start Custom Song Creation (100 Credits)"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      
      case 'waiting':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Creating Your Custom Song</CardTitle>
              <CardDescription>
                Our team is working on your custom song
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-melody-primary/10 p-6">
                  <Loader2 className="h-10 w-10 animate-spin text-melody-secondary" />
                </div>
                <h3 className="text-xl font-semibold mt-6">Crafting Your Lyrics</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-md">
                  Our team is working on creating custom lyrics based on your description.
                  This typically takes 24-48 hours, but we've expedited it for this demo.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'lyrics':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Lyrics</CardTitle>
              <CardDescription>
                Our team has created these lyric options for you. Select one to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {lyricOptions.map((option) => (
                  <div 
                    key={option.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedLyric === option.id 
                        ? "border-melody-secondary bg-melody-primary/5" 
                        : "border-border hover:border-melody-secondary/50"
                    }`}
                    onClick={() => handleLyricSelection(option.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{option.title}</h3>
                      <div 
                        className={`w-5 h-5 rounded-full border ${
                          selectedLyric === option.id 
                            ? "bg-melody-secondary border-melody-secondary" 
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                    <pre className="mt-2 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                      {option.preview}
                    </pre>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  onClick={handleLyricSubmit}
                  disabled={isGenerating || !selectedLyric}
                  className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Instrumental Creation"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Request sent",
                      description: "We've sent your feedback to our team. They'll provide new options shortly.",
                    });
                  }}
                  className="w-full"
                >
                  Request Different Lyrics
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'rhythm':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Instrumental</CardTitle>
              <CardDescription>
                Choose how many instrumental versions you want and select your favorite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex items-center">
                  <FileMusic className="h-5 w-5 text-amber-500 mr-2" />
                  <h3 className="text-sm font-medium text-amber-800">Version Selection</h3>
                </div>
                <p className="text-sm text-amber-700 mt-2">
                  First 2 versions are included. Each additional 2 versions costs 20 more credits.
                </p>
              </div>
              
              <div>
                <Label htmlFor="version-count" className="text-base font-medium">
                  Number of instrumental versions (2-10)
                </Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setVersionCount(Math.max(2, versionCount - 1))}
                  >
                    -
                  </Button>
                  <span className="text-lg font-medium">{versionCount}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setVersionCount(Math.min(10, versionCount + 1))}
                  >
                    +
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {versionCount > 2 ? `(${Math.floor((versionCount - 2) / 2) * 20} additional credits)` : "(included)"}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Select your preferred version:
                </Label>
                <div className="grid grid-cols-1 gap-4">
                  {instrumentalOptions.map((option) => (
                    <div 
                      key={option.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedVersion === option.id 
                          ? "border-melody-secondary bg-melody-primary/5" 
                          : "border-border hover:border-melody-secondary/50"
                      }`}
                      onClick={() => setSelectedVersion(option.id)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{option.title}</h3>
                        <div 
                          className={`w-5 h-5 rounded-full border ${
                            selectedVersion === option.id 
                              ? "bg-melody-secondary border-melody-secondary" 
                              : "border-gray-300"
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {option.preview}
                      </p>
                      <div className="mt-3 p-3 bg-muted rounded flex items-center justify-center">
                        <div className="audio-wave scale-[80%]">
                          <div className="audio-wave-bar h-4 animate-wave1"></div>
                          <div className="audio-wave-bar h-6 animate-wave2"></div>
                          <div className="audio-wave-bar h-3 animate-wave3"></div>
                          <div className="audio-wave-bar h-5 animate-wave4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleInstrumentalSubmit}
                disabled={isGenerating || !selectedVersion}
                className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Final Song...
                  </>
                ) : (
                  "Generate Final Custom Song"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      
      case 'final':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Custom Song is Complete!</CardTitle>
              <CardDescription>
                Your personalized song has been created by our team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <h3 className="text-xl font-semibold mb-2">Sunset Love - Custom Track</h3>
                <p className="text-muted-foreground mb-6">Created just for you</p>
                
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={handleSaveToLibrary}>
                    <Music className="mr-2 h-4 w-4" />
                    Save to Library
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    Download
                  </Button>
                  <Button variant="outline" onClick={handleShare}>
                    Share
                  </Button>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('initial');
                  setSelectedGenre("");
                  setDescription("");
                  setSelectedLyric(null);
                  setSelectedVersion(null);
                  setVersionCount(2);
                }}
              >
                Create Another Custom Song
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return renderStepContent();
};

export default CustomSongCreation;
