import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Music, FileMusic, Pencil, CheckCircle, Plus, RotateCcw } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SplitAudioControl from "./SplitAudioControl";
import VoiceCloning from "./VoiceCloning";
import VoiceChanger from "./VoiceChanger";
import { useCustomSongRequests, CustomSongLyrics } from "@/hooks/use-custom-song-requests";
import { useGenres } from "@/hooks/use-genres";

export interface Genre {
  id: string;
  name: string;
  prompt_template: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type CreationStep = 'initial' | 'waiting' | 'lyrics' | 'rhythm' | 'final';

const CustomSongCreation = () => {
  const [step, setStep] = useState<CreationStep>('initial');
  const [selectedGenre, setSelectedGenre] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [availableLyrics, setAvailableLyrics] = useState<CustomSongLyrics[]>([]);
  const [selectedLyric, setSelectedLyric] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState<number>(2);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const { user, updateUserCredits } = useAuth();
  const navigate = useNavigate();
  const [editedLyrics, setEditedLyrics] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [forceNewRequest, setForceNewRequest] = useState(false);

  const { requests, createRequest, fetchLyricsForRequest, selectLyrics } = useCustomSongRequests();
  const { genres, loading: genresLoading } = useGenres();

  useEffect(() => {
    if (forceNewRequest) return; // Skip auto-resume if user wants to start new
    
    const pendingRequest = requests.find(req => req.status === 'pending');
    const lyricsProposedRequest = requests.find(req => req.status === 'lyrics_proposed');
    
    if (lyricsProposedRequest) {
      setCurrentRequestId(lyricsProposedRequest.id);
      setSelectedGenre(lyricsProposedRequest.genre_id || '');
      setDescription(lyricsProposedRequest.description);
      setStep('lyrics');
      loadLyricsForRequest(lyricsProposedRequest.id);
    } else if (pendingRequest) {
      setCurrentRequestId(pendingRequest.id);
      setSelectedGenre(pendingRequest.genre_id || '');
      setDescription(pendingRequest.description);
      setStep('waiting');
    }
  }, [requests, forceNewRequest]);

  const loadLyricsForRequest = async (requestId: string) => {
    const lyrics = await fetchLyricsForRequest(requestId);
    setAvailableLyrics(lyrics);
    if (lyrics.length > 0 && !selectedLyric) {
      setSelectedLyric(lyrics[0].id);
      setEditedLyrics(lyrics[0].lyrics);
    }
  };

  const handleStartNewRequest = () => {
    setForceNewRequest(true);
    setStep('initial');
    setSelectedGenre("");
    setDescription("");
    setCurrentRequestId(null);
    setAvailableLyrics([]);
    setSelectedLyric(null);
    setEditedLyrics("");
    setIsEditing(false);
    setSelectedVersion(null);
    setVersionCount(2);
    setSelectedVoiceId(null);
  };

  const handleInitialSubmit = async () => {
    if (!selectedGenre) {
      toast.error("Select a music genre to continue");
      return;
    }

    if (!description) {
      toast.error("Describe your song in detail to help our team create it");
      return;
    }

    if ((user?.credits || 0) < 100) {
      toast.error("You need 100 credits to request a custom song");
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Creating custom song request with:', {
        description,
        selectedGenre
      });
      
      const request = await createRequest(description, description, selectedGenre);
      
      if (request) {
        console.log('Custom song request created successfully:', request);
        setCurrentRequestId(request.id);
        updateUserCredits(-100);
        setStep('waiting');
        setForceNewRequest(false);
        toast.success("Your custom song request has been submitted to our team");
      } else {
        throw new Error('Failed to create request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLyricSelection = (lyricId: string) => {
    setSelectedLyric(lyricId);
    const selectedOption = availableLyrics.find(lyric => lyric.id === lyricId);
    setEditedLyrics(selectedOption?.lyrics || "");
  };

  const handleLyricEdit = () => {
    setIsEditing(true);
  };

  const handleSaveLyrics = () => {
    setIsEditing(false);
    toast.success("Your edits have been saved successfully");
  };

  const handleLyricSubmit = async () => {
    if (!selectedLyric || !currentRequestId) {
      toast.error("Choose one of the lyric options to continue");
      return;
    }

    setIsGenerating(true);
    
    try {
      const success = await selectLyrics(selectedLyric, currentRequestId);
      if (success) {
        setStep('rhythm');
        toast.success("Lyrics selected! Our team is now working on your instrumental options");
      }
    } catch (error) {
      console.error('Error selecting lyrics:', error);
      toast.error("Failed to select lyrics. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInstrumentalSubmit = () => {
    if (!selectedVersion) {
      toast.error("Choose one of the instrumental options to continue");
      return;
    }

    const additionalVersions = Math.max(0, versionCount - 2);
    const additionalCreditsNeeded = Math.floor(additionalVersions / 2) * 20;
    
    if ((user?.credits || 0) < additionalCreditsNeeded) {
      toast.error(`You need ${additionalCreditsNeeded} more credits for ${versionCount} versions`);
      return;
    }

    setIsGenerating(true);
    
    if (additionalCreditsNeeded > 0) {
      updateUserCredits(-additionalCreditsNeeded);
    }
    
    setTimeout(() => {
      setIsGenerating(false);
      setStep('final');
      
      toast.success("Your custom song has been successfully created");
    }, 3000);
  };

  const handleSaveToLibrary = () => {
    toast.success("Your custom song has been saved to your library");
    navigate("/library");
  };

  const renderStepContent = () => {
    switch (step) {
      case 'initial':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Create a Custom Song</CardTitle>
                  <CardDescription>
                    Work with our team to create a personalized song with professional quality
                  </CardDescription>
                </div>
                {(requests.some(req => req.status === 'pending') || requests.some(req => req.status === 'lyrics_proposed')) && !forceNewRequest && (
                  <Button 
                    variant="outline" 
                    onClick={handleStartNewRequest}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Request
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="genre-custom" className="text-base font-medium">
                    1. Select a genre
                  </Label>
                  {genresLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading genres...</span>
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
                            id={`${genre.id}-custom`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`${genre.id}-custom`}
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-2">
                              <Music className="h-5 w-5" />
                            </div>
                            <div className="font-medium">{genre.name}</div>
                            <div className="text-xs text-muted-foreground text-center">
                              {genre.description || "AI-generated music genre"}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Creating Your Custom Song</CardTitle>
                  <CardDescription>
                    Our team is working on your custom song
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleStartNewRequest}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-melody-primary/10 p-6">
                  <Loader2 className="h-10 w-10 animate-spin text-melody-secondary" />
                </div>
                <h3 className="text-xl font-semibold mt-6">Crafting Your Lyrics</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-md">
                  Our team is working on creating custom lyrics based on your description.
                  You'll receive a notification when the lyrics are ready for review.
                </p>
                <div className="mt-4 p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    <strong>Request ID:</strong> {currentRequestId?.slice(-8)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Genre:</strong> {selectedGenre}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'lyrics':
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Choose Your Lyrics</CardTitle>
                  <CardDescription>
                    Our team has created these lyric options for you. Select one to continue.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleStartNewRequest}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {availableLyrics.map((lyric, index) => (
                  <div 
                    key={lyric.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedLyric === lyric.id 
                        ? "border-melody-secondary bg-melody-primary/5" 
                        : "border-border hover:border-melody-secondary/50"
                    }`}
                    onClick={() => handleLyricSelection(lyric.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Lyrics Option {index + 1}</h3>
                      <div 
                        className={`w-5 h-5 rounded-full border ${
                          selectedLyric === lyric.id 
                            ? "bg-melody-secondary border-melody-secondary" 
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {lyric.lyrics.substring(0, 150)}...
                    </p>
                  </div>
                ))}
              </div>

              {selectedLyric && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Preview & Edit Lyrics</Label>
                    {!isEditing ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLyricEdit}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSaveLyrics}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={editedLyrics}
                    onChange={(e) => setEditedLyrics(e.target.value)}
                    rows={10}
                    disabled={!isEditing}
                    className={`font-mono ${!isEditing ? 'bg-muted' : ''}`}
                  />
                </div>
              )}
              
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
                    toast.success("We've sent your feedback to our team. They'll provide new options shortly.");
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Create Your Instrumental</CardTitle>
                  <CardDescription>
                    Choose how many instrumental versions you want and select your favorite
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleStartNewRequest}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Request
                </Button>
              </div>
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
                  {['version1', 'version2'].map((versionId, index) => (
                    <div 
                      key={versionId}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedVersion === versionId 
                          ? "border-melody-secondary bg-melody-primary/5" 
                          : "border-border hover:border-melody-secondary/50"
                      }`}
                      onClick={() => setSelectedVersion(versionId)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Instrumental Version {index + 1}</h3>
                        <div 
                          className={`w-5 h-5 rounded-full border ${
                            selectedVersion === versionId 
                              ? "bg-melody-secondary border-melody-secondary" 
                              : "border-gray-300"
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {index === 0 ? "Smooth arrangement with piano and gentle beats" : "Upbeat arrangement with strong drums and melodic synths"}
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
                Your personalized song has been created in {versionCount} different versions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {Array.from({ length: versionCount }, (_, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-melody-primary/10 flex items-center justify-center">
                        <Music className="h-6 w-6 text-melody-secondary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold">Version {index + 1}</h3>
                      <p className="text-sm text-muted-foreground">
                        {index % 2 === 0 ? "Smooth arrangement with piano and gentle beats" : "Upbeat arrangement with strong drums and melodic synths"}
                      </p>
                      <div className="mt-3 p-2 bg-muted rounded flex items-center justify-start">
                        <div className="audio-wave scale-75">
                          <div className="audio-wave-bar h-4 animate-wave1"></div>
                          <div className="audio-wave-bar h-6 animate-wave2"></div>
                          <div className="audio-wave-bar h-3 animate-wave3"></div>
                          <div className="audio-wave-bar h-5 animate-wave4"></div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">Play</Button>
                        <Button size="sm" variant="outline">Download</Button>
                        <SplitAudioControl songName={`Version ${index + 1}`} songUrl="mock-url" />
                        <div className="flex items-center gap-2 mt-2">
                          <VoiceCloning 
                            onVoiceCloned={(voiceId) => setSelectedVoiceId(voiceId)} 
                          />
                          {selectedVoiceId && (
                            <VoiceChanger 
                              songName={`Version ${index + 1}`} 
                              songUrl="mock-url"
                              voiceId={selectedVoiceId}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center gap-3">
                <Button onClick={handleSaveToLibrary}>
                  <Music className="mr-2 h-4 w-4" />
                  Save All to Library
                </Button>
                <Button variant="outline" onClick={() => toast.success("Share link copied to clipboard")}>
                  Share
                </Button>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleStartNewRequest}
              >
                Create Another Custom Song
              </Button>
            </CardContent>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return renderStepContent();
};

export default CustomSongCreation;
