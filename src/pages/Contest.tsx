import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trophy, Vote, Play, Pause, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest, Contest as ContestType } from "@/hooks/use-contest";
import { useContestSubmission } from "@/hooks/useContestSubmission";
import { VoteDialog } from "@/components/contest/VoteDialog";
import { ContestCard } from "@/components/contest/ContestCard";

interface Song {
  id: string;
  title: string;
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

const Contest = () => {
  const { user, isSubscriber, userRoles } = useAuth();
  const {
    upcomingContests,
    activeContests,
    contestEntries,
    loading,
    isVoting,
    castVote,
    checkHasFreeVote,
    unlockContest,
    submitting: isUnlocking,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);
  const [selectedContest, setSelectedContest] = useState<ContestType | null>(null);
  const { submitEntry, isSubmitting } = useContestSubmission();
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [submissionDescription, setSubmissionDescription] = useState("");

  useEffect(() => {
    if (user && selectedEntry) {
      checkHasFreeVote(selectedEntry.contest_id).then(setUserHasFreeVote);
    }
  }, [user, selectedEntry, checkHasFreeVote]);

  useEffect(() => {
    if (user) {
      fetchUserSongs();
    }
  }, [user]);

  const fetchUserSongs = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      console.error("Error fetching songs:", error);
    }
  };

  const handleSubmission = async () => {
    if (!selectedContest || !selectedSong) {
      toast.error("Please select a song to submit.");
      return;
    }
    try {
      await submitEntry({
        contestId: selectedContest.id,
        songId: selectedSong,
        description: submissionDescription,
      });
      setSubmissionDialogOpen(false);
      setSelectedSong("");
      setSubmissionDescription("");
    } catch (error) {
      // Error is already toasted in the hook
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

  const handleUnlockContest = async (contestId: string, fee: number) => {
    if (!user) {
      toast.error("Please log in to unlock contests.");
      return;
    }
    if (!isSubscriber()) {
      toast.error("You must be a subscriber to unlock contests.");
      return;
    }
    await unlockContest(contestId, fee);
  };

  const handleEnterContest = (contest: ContestType) => {
    setSelectedContest(contest);
    setSubmissionDialogOpen(true);
  };

  const handleVoteClick = (entry: ContestEntry) => {
    if (!user) {
      toast.info('Please log in or register to vote.');
      return;
    }
    if (entry.user_id === user.id) {
      toast.error('You cannot vote on your own entry.');
      return;
    }
    setSelectedEntry(entry);
    setVoteDialogOpen(true);
  };

  const handleVoteSubmit = async (votes: number) => {
    if (!selectedEntry) return;

    await castVote(selectedEntry.id, selectedEntry.contest_id, votes);
    setVoteDialogOpen(false);
    setSelectedEntry(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading contests...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="text-center flex-shrink-0">
        <h1 className="text-3xl font-semibold mb-2 text-white">Music Contests</h1>
        <p className="text-gray-400">
          Showcase your talent and win amazing prizes!
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-3 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Upcoming</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Active</TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Entries</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6">
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Upcoming Contests</h3>
                  <p className="text-gray-400">
                    Check back later for new contests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingContests.map((contest) => (
                  <ContestCard
                    key={contest.id}
                    contest={contest}
                    onUnlock={handleUnlockContest}
                    onEnter={handleEnterContest}
                    isUnlocking={isUnlocking}
                    status="upcoming"
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="active" className="space-y-4">
            {activeContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                  <p className="text-gray-400">
                    Check back later for new contests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeContests.map((contest) => (
                  <ContestCard
                    key={contest.id}
                    contest={contest}
                    onUnlock={handleUnlockContest}
                    onEnter={handleEnterContest}
                    isUnlocking={isUnlocking}
                    status="active"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-2">
            {contestEntries.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Vote className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Entries Yet</h3>
                  <p className="text-gray-400">
                    Be the first to submit an entry!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {contestEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <Button variant="ghost" size="icon" onClick={() => handlePlay(entry.songs)} className="text-gray-300 hover:text-white">
                      {currentTrack?.id === entry.songs?.id && isPlaying ? (
                        <Pause className="h-5 w-5 text-dark-purple" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex-grow mx-4 min-w-0">
                      <p className="font-semibold truncate">{entry.songs?.title || 'Contest Entry'}</p>
                      <p className="text-sm text-gray-400">
                        By {entry.profiles?.full_name || 'Unknown Artist'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Vote className="h-4 w-4 text-dark-purple" />
                        <span>{entry.vote_count}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVoteClick(entry)}
                        disabled={isVoting}
                        className="bg-transparent border-white/30 hover:bg-white/10 text-white"
                      >
                        Vote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {selectedEntry && (
        <VoteDialog
          open={voteDialogOpen}
          onOpenChange={setVoteDialogOpen}
          onVoteSubmit={handleVoteSubmit}
          entryTitle={selectedEntry.songs?.title || 'this entry'}
          userHasFreeVote={userHasFreeVote}
          userCredits={user?.profile?.credits ?? 0}
          isVoting={isVoting}
        />
      )}

      {submissionDialogOpen && selectedContest && (
        <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit to {selectedContest.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="song">Select a song</Label>
                <Select value={selectedSong} onValueChange={setSelectedSong}>
                  <SelectTrigger id="song">
                    <SelectValue placeholder="Select a song to submit" />
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={submissionDescription}
                  onChange={(e) => setSubmissionDescription(e.target.value)}
                  placeholder="Tell us a bit about your entry."
                />
              </div>
              <Button onClick={handleSubmission} disabled={isSubmitting} className="w-full bg-dark-purple hover:bg-opacity-90 font-bold">
                {isSubmitting ? "Submitting..." : "Submit Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Contest;
