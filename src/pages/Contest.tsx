import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Upload, Vote, Play, Pause } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useContest } from "@/hooks/use-contest";
import { useContestSubmission } from "@/hooks/useContestSubmission";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

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
    id: string;
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
  const { voteForEntry, submitting: voting } = useContest();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);

  useEffect(() => {
    fetchContests();
    fetchContestEntries();
    if (user) {
      fetchUserSongs();
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
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (entriesError) throw entriesError;

      const entriesWithDetails: ContestEntry[] = await Promise.all(
        (entriesData || []).map(async (entry) => {
          let profileData = null;
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', entry.user_id)
              .maybeSingle();
            if (!error && data) profileData = data;
          } catch (error) {
            console.warn('Failed to fetch profile for user:', entry.user_id, error);
          }

          let songData = null;
          if (entry.song_id) {
            try {
              const { data, error } = await supabase
                .from('songs')
                .select('id, title, audio_url')
                .eq('id', entry.song_id)
                .maybeSingle();
              if (!error && data) songData = data;
            } catch (error) {
              console.warn('Failed to fetch song for entry:', entry.song_id, error);
            }
          }

          return {
            ...entry,
            profiles: profileData ? { full_name: profileData.full_name || 'Unknown Artist' } : null,
            songs: songData,
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
    if (!selectedSong) {
      toast.error('Please select a song');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    const success = await submitEntry({
      contestId: selectedContest.id,
      songId: selectedSong || undefined,
      description: description.trim()
    });

    if (success) {
      setSubmissionDialogOpen(false);
      setSelectedSong("");
      setDescription("");
      setSelectedContest(null);
      fetchContestEntries();
    }
  };

  const handlePlay = (song: ContestEntry['songs']) => {
    if (!song) return;
    if (currentTrack?.id === song.id && isPlaying) {
      togglePlayPause();
    } else if (song.audio_url) {
      playTrack({
        id: song.id,
        title: song.title,
        audio_url: song.audio_url
      });
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading contests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Music Contests</h1>
        <p className="text-muted-foreground">
          Showcase your talent and win amazing prizes!
        </p>
      </div>

      <Tabs defaultValue="contests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contests">Active Contests</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="contests" className="space-y-4">
          {!canViewContests ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Subscription Required</h3>
                <p className="text-muted-foreground mb-4">
                  Subscribe to view and participate in contests.
                </p>
                <Button onClick={() => window.location.href = '/credits'}>
                  View Plans
                </Button>
              </CardContent>
            </Card>
          ) : contests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Contests</h3>
                <p className="text-muted-foreground">
                  Check back later for new contests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="[column-count:1] md:[column-count:2] lg:[column-count:3] gap-4 space-y-4">
              {contests.map((contest) => (
                <div key={contest.id} className="break-inside-avoid">
                  <Card className="w-full overflow-hidden">
                    <CardHeader className="p-4 bg-muted/40">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          {contest.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          Prize: {contest.prize}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-muted-foreground text-sm mb-4">{contest.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Ends {new Date(contest.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {contest.entry_fee > 0 && (
                          <Badge>
                            Entry: {contest.entry_fee} credits
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-2 bg-muted/40">
                      {canParticipate ? (
                        <Button size="sm" className="w-full" onClick={() => openSubmissionDialog(contest)}>
                          Submit Your Entry
                        </Button>
                      ) : (
                        <Button size="sm" disabled className="w-full">
                          Subscription Required to Enter
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-2">
          {entriesLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2">Loading entries...</span>
            </div>
          ) : contestEntries.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Entries Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to submit an entry!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contestEntries.map((entry) => (
                <div key={entry.id} className="flex items-center p-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors">
                  <Button variant="ghost" size="icon" onClick={() => handlePlay(entry.songs)}>
                    {currentTrack?.id === entry.songs?.id && isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="flex-grow mx-4">
                    <p className="font-semibold">{entry.songs?.title || 'Contest Entry'}</p>
                    <p className="text-sm text-muted-foreground">
                      By {entry.profiles?.full_name || 'Unknown Artist'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Vote className="h-4 w-4" />
                      <span>{entry.vote_count}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => voteForEntry(entry.id)}
                      disabled={voting || user?.id === entry.user_id}
                    >
                      {voting ? 'Voting...' : 'Vote'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit to "{selectedContest?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="song-select">Select Your Song</Label>
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed song" />
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
            <div className="space-y-2">
              <Label htmlFor="description">Entry Description</Label>
              <Textarea
                id="description"
                placeholder="Tell everyone about your track..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSubmissionDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitEntry} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Entry
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contest;
