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
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";

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
  const {
    activeContests: contests,
    contestEntries,
    loading,
    isVoting,
    castVote,
    checkHasFreeVote,
    refreshEntries,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
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
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="text-center flex-shrink-0">
        <h1 className="text-3xl font-semibold mb-2 text-white">Music Contests</h1>
        <p className="text-gray-400">
          Showcase your talent and win amazing prizes!
        </p>
      </div>

      <Tabs defaultValue="contests" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="contests" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Active Contests</TabsTrigger>
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
            ) : contests.length === 0 ? (
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
              <div className="[column-count:1] md:[column-count:2] lg:[column-count:3] gap-4 space-y-4">
                {contests.map((contest) => (
                  <div key={contest.id} className="break-inside-avoid">
                    <Card className="w-full overflow-hidden bg-white/5 border-white/10">
                      <CardHeader className="p-4 bg-black/20">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2 text-white">
                            <Trophy className="h-5 w-5 text-dark-purple" />
                            {contest.title}
                          </CardTitle>
                          <Badge className="text-sm bg-dark-purple text-white">
                            Prize: {contest.prize}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-gray-400 text-sm mb-4">{contest.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Ends {new Date(contest.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          {contest.entry_fee > 0 && (
                            <Badge className="bg-dark-purple/50 text-purple-300 border border-dark-purple">
                              Entry: {contest.entry_fee} credits
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-2 bg-black/20">
                        {canParticipate ? (
                          <Button size="sm" className="w-full bg-dark-purple hover:bg-opacity-90 font-bold" onClick={() => openSubmissionDialog(contest)}>
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
