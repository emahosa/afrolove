
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Calendar, Upload, Vote, Play, Pause, Lock, Music } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useContestSubmission } from "@/hooks/useContestSubmission";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest, type Contest as ContestType, type ContestEntry } from "@/hooks/use-contest";

interface Song {
  id: string;
  title: string;
  status: string;
}

const Contest = () => {
  const { user, isVoter, isSubscriber, userRoles } = useAuth();
  const { submitEntry: submitContestEntry, isSubmitting } = useContestSubmission();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const {
    activeContests,
    contestEntries,
    loading: contestsLoading,
    error: contestsError,
    voteForEntry,
    refreshEntries,
    setCurrentContest,
  } = useContest();
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedContest, setSelectedContest] = useState<ContestType | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntryForVote, setSelectedEntryForVote] = useState<ContestEntry | null>(null);
  const [voteCount, setVoteCount] = useState(1);

  useEffect(() => {
    if (user) {
      fetchUserSongs();
    }
  }, [user]);

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

    try {
      const success = await submitContestEntry({
        contestId: selectedContest.id,
        songId: selectedSong,
        description: description.trim()
      });

      if (success) {
        setSubmissionDialogOpen(false);
        setSelectedSong("");
        setDescription("");
        setSelectedContest(null);
        refreshEntries();
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handlePlay = (entry: ContestEntry) => {
    if (!entry.video_url) return;
    if (currentTrack?.id === entry.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: entry.id,
        title: `Entry by ${entry.profiles?.username || 'Unknown'}`,
        audio_url: entry.video_url
      });
    }
  };

  const openSubmissionDialog = (contest: ContestType) => {
    setSelectedContest(contest);
    setSubmissionDialogOpen(true);
  };

  const handleVoteClick = async (entry: ContestEntry) => {
    if (entry.user_id === user?.id) {
      toast.error("You cannot vote for your own entry");
      return;
    }
    
    const success = await voteForEntry(entry.id);
    if (success) {
      refreshEntries();
    }
  };

  const canParticipate = isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');
  const canViewContests = !isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');

  if (contestsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-2">Loading contests...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Music Contests
          </h1>
          <p className="text-muted-foreground text-lg">
            Showcase your talent and win amazing prizes!
          </p>
        </div>

        <Tabs defaultValue="contests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="contests" className="text-lg py-3">Active Contests</TabsTrigger>
            <TabsTrigger value="entries" className="text-lg py-3">Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="contests" className="space-y-6">
            {!canViewContests ? (
              <Card className="text-center py-16 bg-card/50 border-2 border-dashed">
                <CardContent>
                  <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-2xl font-semibold mb-4">Subscription Required</h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Subscribe to view and participate in contests.
                  </p>
                  <Button size="lg" onClick={() => window.location.href = '/credits'}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            ) : activeContests.length === 0 ? (
              <Card className="text-center py-16 bg-card/50 border-2 border-dashed">
                <CardContent>
                  <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-2xl font-semibold mb-4">No Active Contests</h3>
                  <p className="text-muted-foreground text-lg">
                    Check back later for new contests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {activeContests.map((contest) => (
                  <Card key={contest.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl flex items-center gap-3">
                          <Trophy className="h-8 w-8 text-primary" />
                          {contest.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                          Prize: {contest.prize}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                        {contest.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Calendar className="h-5 w-5" />
                          <span className="text-lg">
                            Ends {new Date(contest.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {contest.entry_fee > 0 && (
                          <Badge variant="outline" className="text-lg px-4 py-2">
                            Entry: {contest.entry_fee} credits
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-4">
                      {canParticipate ? (
                        <Button 
                          size="lg" 
                          className="w-full text-lg py-3" 
                          onClick={() => openSubmissionDialog(contest)}
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          Submit Your Entry
                        </Button>
                      ) : (
                        <Button size="lg" disabled className="w-full text-lg py-3">
                          <Lock className="h-5 w-5 mr-2" />
                          Subscription Required to Enter
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-4">
            {contestEntries.length === 0 ? (
              <Card className="text-center py-16 bg-card/50 border-2 border-dashed">
                <CardContent>
                  <Music className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-2xl font-semibold mb-4">No Entries Yet</h3>
                  <p className="text-muted-foreground text-lg">
                    Be the first to submit an entry!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="text-lg">Entry</TableHead>
                      <TableHead className="text-center text-lg">Votes</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contestEntries.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handlePlay(entry)}>
                            {currentTrack?.id === entry.id && isPlaying ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-lg">{`Entry by ${entry.profiles?.username || 'Unknown'}`}</div>
                          <div className="text-sm text-muted-foreground">
                            By {entry.profiles?.full_name || 'Unknown Artist'}
                          </div>
                          {entry.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {entry.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {entry.vote_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="lg" 
                            onClick={() => handleVoteClick(entry)}
                            disabled={entry.user_id === user?.id}
                          >
                            <Vote className="h-5 w-5 mr-2" />
                            Vote
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">Submit to "{selectedContest?.title}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="song-select" className="text-lg">Select Your Song</Label>
                <Select value={selectedSong} onValueChange={setSelectedSong}>
                  <SelectTrigger className="text-lg py-3">
                    <SelectValue placeholder="Choose a completed song" />
                  </SelectTrigger>
                  <SelectContent>
                    {songs.map((song) => (
                      <SelectItem key={song.id} value={song.id} className="text-lg">
                        {song.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-lg">Entry Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell everyone about your track..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="text-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSubmissionDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button size="lg" onClick={handleSubmitEntry} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Submit Entry
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Contest;
