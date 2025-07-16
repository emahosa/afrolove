import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, Upload, Music, Vote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useContestSubmission } from "@/hooks/useContestSubmission";
import { ensureStorageBuckets } from "@/utils/storageSetup";

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize: string;
  entry_fee: number;
  status: string;
}

interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  description: string;
  vote_count: number;
  song_id: string | null;
  video_url: string | null;
  approved: boolean;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
  songs?: {
    title: string;
    audio_url: string;
  } | null;
}

interface Song {
  id: string;
  title: string;
  status: string;
}

const Contest = () => {
  const { user, isVoter, isSubscriber, userRoles } = useAuth();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  useEffect(() => {
    fetchContests();
    fetchContestEntries();
    if (user) {
      fetchUserSongs();
      ensureStorageBuckets();
    }
  }, [user]);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (error: any) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestEntries = async () => {
    setEntriesLoading(true);
    try {
      // First get contest entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (entriesError) throw entriesError;

      // Transform entries with safe data handling
      const entriesWithDetails: ContestEntry[] = await Promise.all(
        (entriesData || []).map(async (entry) => {
          // Safely get profile data
          let profileData = null;
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', entry.user_id)
              .maybeSingle(); // Use maybeSingle instead of single
            
            if (!error && data) {
              profileData = data;
            }
          } catch (error) {
            console.warn('Failed to fetch profile for user:', entry.user_id, error);
          }

          // Safely get song data if song_id exists
          let songData = null;
          if (entry.song_id) {
            try {
              const { data, error } = await supabase
                .from('songs')
                .select('title, audio_url')
                .eq('id', entry.song_id)
                .maybeSingle(); // Use maybeSingle instead of single
              
              if (!error && data) {
                songData = data;
              }
            } catch (error) {
              console.warn('Failed to fetch song for entry:', entry.song_id, error);
            }
          }

          return {
            ...entry,
            profiles: profileData ? { 
              full_name: profileData.full_name || 'Unknown Artist' 
            } : null,
            songs: songData ? { 
              title: songData.title, 
              audio_url: songData.audio_url 
            } : null
          };
        })
      );

      setContestEntries(entriesWithDetails);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      toast.error('Failed to load contest entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  const fetchUserSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, status')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleSubmitEntry = async () => {
    if (!selectedContest) return;

    if (!selectedSong && !videoFile) {
      toast.error('Please select a song or upload a video');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    const success = await submitEntry({
      contestId: selectedContest.id,
      songId: selectedSong || undefined,
      videoFile: videoFile || undefined,
      description: description.trim()
    });

    if (success) {
      setSubmissionDialogOpen(false);
      setSelectedSong("");
      setVideoFile(null);
      setDescription("");
      setSelectedContest(null);
      fetchContestEntries(); // Refresh entries
    }
  };

  const openSubmissionDialog = (contest: Contest) => {
    setSelectedContest(contest);
    setSubmissionDialogOpen(true);
  };

  const canParticipate = isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');
  const canViewContests = !isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading contests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Music Contests</h1>
        <p className="text-muted-foreground">
          Participate in exciting music contests and showcase your talent
        </p>
      </div>

      <Tabs defaultValue="contests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="entries">Contest Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="contests" className="space-y-6">
          {!canViewContests ? (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Subscription Required</h3>
                <p className="text-muted-foreground mb-4">
                  Subscribe to view and participate in contests
                </p>
                <Button onClick={() => window.location.href = '/subscribe'}>
                  View Subscription Plans
                </Button>
              </CardContent>
            </Card>
          ) : contests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Contests</h3>
                <p className="text-muted-foreground">
                  Check back later for new contests to participate in
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contests.map((contest) => (
                <Card key={contest.id} className="w-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-melody-secondary" />
                        <CardTitle>{contest.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-melody-secondary">
                        Prize: {contest.prize}
                      </Badge>
                    </div>
                    <CardDescription>{contest.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(contest.start_date).toLocaleDateString()} - {new Date(contest.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {contest.entry_fee > 0 && (
                        <Badge variant="outline">
                          Entry: {contest.entry_fee} credits
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    {canParticipate ? (
                      <Button 
                        className="w-full"
                        onClick={() => openSubmissionDialog(contest)}
                      >
                        Enter Contest
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        Subscription Required
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-6">
          {entriesLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
              <span className="ml-2">Loading contest entries...</span>
            </div>
          ) : contestEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Contest Entries</h3>
                <p className="text-muted-foreground">
                  Be the first to submit an entry to any contest
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contestEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{entry.songs?.title || 'Contest Entry'}</CardTitle>
                    <CardDescription>
                      By {entry.profiles?.full_name || 'Unknown Artist'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {entry.description}
                    </p>
                    
                    {entry.songs?.audio_url && (
                      <audio controls className="w-full mb-4">
                        <source src={entry.songs.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    
                    {entry.video_url && (
                      <video controls className="w-full mb-4">
                        <source src={entry.video_url} type="video/mp4" />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Vote className="h-4 w-4" />
                      <span className="text-sm">{entry.vote_count} votes</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Vote
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submission Dialog */}
      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Contest Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedContest && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">{selectedContest.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedContest.description}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="song-select">Select Your Song (Optional)</Label>
                <Select value={selectedSong} onValueChange={setSelectedSong}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a song from your library" />
                  </SelectTrigger>
                  <SelectContent>
                    {songs.map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="video-upload">Upload Performance Video (Optional)</Label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {videoFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {videoFile.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Entry Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your entry..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitEntry}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Entry
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSubmissionDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contest;
