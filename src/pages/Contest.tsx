import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Upload, Vote, Play, Pause, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest, Contest as ContestType } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";

const ContestCountdown = ({ startDate }: { startDate: string }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(startDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
    if (value) {
      return (
        <span key={interval} className="text-sm font-semibold">
          {value} {interval}{" "}
        </span>
      );
    }
    return null;
  });

  return (
    <div className="flex items-center gap-2 text-xs text-yellow-400">
      <Calendar className="h-4 w-4" />
      <span>Starts in: {timerComponents.length ? timerComponents : "Time's up!"}</span>
    </div>
  );
};

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
  audio_url: string;
}

const Contest = () => {
  const { user, isVoter, isSubscriber, userRoles } = useAuth();
  const {
    activeContests: contests,
    contestEntries,
    loading,
    submitting,
    isVoting,
    castVote,
    checkHasFreeVote,
    unlockContest,
    submitEntry,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<ContestType | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);

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
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, status, audio_url')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSongs(data || []);
    } catch (error: any) {
      console.error('Error fetching songs:', error);
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

  const openSubmissionDialog = (contest: ContestType) => {
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

  const handleUnlockContest = async (contest: ContestType) => {
    if (!user) {
      toast.info("Please log in to unlock contests.");
      return;
    }
    await unlockContest(contest.id, contest.entry_fee);
  };

  const handleSubmitEntry = async () => {
    if (!selectedContest || !selectedSong || !description) {
      toast.error("Please select a song and provide a description.");
      return;
    }

    const song = songs.find(s => s.id === selectedSong);
    if (!song || !song.audio_url) {
      toast.error("Selected song is not available for submission.");
      return;
    }

    try {
      const response = await fetch(song.audio_url);
      const blob = await response.blob();
      const file = new File([blob], `${song.title}.mp3`, { type: "audio/mpeg" });

      await submitEntry(selectedContest.id, file, description, song.title);
      setSubmissionDialogOpen(false);
    } catch (error) {
      toast.error("Failed to prepare song for submission.");
      console.error(error);
    }
  };

  const canParticipate = isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');
  const canViewContests = !isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');

  const visibleContests = useMemo(() => {
    return contests.filter(c => c.status === 'active' || new Date(c.start_date) > new Date());
  }, [contests]);

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

      <Tabs defaultValue="contests" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="contests" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Contests</TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Entries</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6">
          <TabsContent value="contests" className="space-y-4">
            {!canViewContests ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">Subscription Required</h3>
                  <p className="text-gray-400 mb-4">
                    Subscribe to view and participate in contests.
                  </p>
                  <Button onClick={() => window.location.href = '/credits'} className="bg-dark-purple hover:bg-opacity-90 font-bold">
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            ) : visibleContests.length === 0 ? (
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
                {visibleContests.map((contest) => (
                <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-grow mx-4 min-w-0">
                    <p className="font-semibold truncate text-white">{contest.title}</p>
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {contest.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-dark-purple" />
                            <span>Prize: {contest.prize}</span>
                        </div>
                        {contest.status === 'upcoming' ? (
                          <ContestCountdown startDate={contest.start_date} />
                        ) : (
                          <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Ends: {new Date(contest.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {canParticipate ? (
                      contest.status === 'active' ? (
                        contest.entry_fee > 0 && !contest.is_unlocked ? (
                          <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 font-bold" onClick={() => handleUnlockContest(contest)} disabled={submitting}>
                            <Lock className="w-4 h-4 mr-2" />
                            Unlock ({contest.entry_fee} credits)
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-dark-purple hover:bg-opacity-90 font-bold" onClick={() => openSubmissionDialog(contest)}>
                            Submit Entry
                          </Button>
                        )
                      ) : (
                        <Button size="sm" disabled>Upcoming</Button>
                      )
                    ) : (
                      <Button size="sm" disabled>
                        Subscribe to Enter
                      </Button>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-2">
            {entriesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
                <span className="ml-2">Loading entries...</span>
              </div>
            ) : contestEntries.length === 0 ? (
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

      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to {selectedContest?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="song">Select your song</Label>
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed song" />
                </SelectTrigger>
                <SelectContent>
                  {songs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>{song.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your entry"
              />
            </div>
          </div>
          <Button onClick={handleSubmitEntry} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Entry"}
          </Button>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default Contest;
