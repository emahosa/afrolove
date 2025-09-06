import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "../components/ui/input";
import { Trophy, Calendar, Upload, Vote, Play, Pause } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";
import { SubmissionDialog } from "@/components/contest/SubmissionDialog";

// Contest component main interface
interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize: string;
  entry_fee: number;
  status: string;
  is_unlocked?: boolean;
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
  const { user, isVoter, isSubscriber, userRoles, loading: authLoading } = useAuth();
  const {
    upcomingContests,
    activeContests,
    pastContests,
    contestEntries,
    loading: contestLoading,
    isVoting,
    castVote,
    checkHasFreeVote,
    refreshEntries,
    unlockContest,
    submitting,
    setCurrentContest,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);
  const [activeContestTab, setActiveContestTab] = useState<string | undefined>(activeContests[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeContests.length > 0 && !activeContestTab) {
      setActiveContestTab(activeContests[0].id);
    }
  }, [activeContests, activeContestTab]);

  useEffect(() => {
    const contest = activeContests.find(c => c.id === activeContestTab);
    if (contest) {
      setCurrentContest(contest);
    }
  }, [activeContestTab, activeContests, setCurrentContest]);

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

  const handleUnlockContest = async (contest: Contest) => {
    if (!user) {
      toast.info('Please log in to unlock the contest.');
      return;
    }
    await unlockContest(contest.id, contest.entry_fee);
  };

  const Countdown = ({ to }: { to: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const interval = setInterval(() => {
        const target = new Date(to).getTime();
        const now = new Date().getTime();
        const difference = target - now;

        if (difference < 0) {
          setTimeLeft('Contest is live!');
          clearInterval(interval);
          return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }, 1000);

      return () => clearInterval(interval);
    }, [to]);

    return <span className="text-sm font-mono">{timeLeft}</span>;
  };

  if (authLoading || contestLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="text-center flex-shrink-0">
        <h1 className="text-3xl font-semibold mb-2 text-white">Music Contests</h1>
        <p className="text-white/70">
          Showcase your talent and win amazing prizes!
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6 glass-surface">
          <TabsContent value="active" className="space-y-4">
            {activeContests.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-white/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                <p className="text-white/70">Check back later for new contests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeContests.map((contest) => (
                  <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-grow mx-4 min-w-0">
                      <p className="font-semibold truncate text-white">{contest.title}</p>
                      <p className="text-sm text-white/70 line-clamp-1">{contest.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-white/70">
                        <div className="flex items-center gap-1"><Trophy className="h-4 w-4" /><span>Prize: {contest.prize}</span></div>
                        <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Ends: {new Date(contest.end_date).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {contest.is_unlocked ? (
                        <Button size="sm" onClick={() => openSubmissionDialog(contest)}>
                          Submit Entry
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleUnlockContest(contest)} disabled={submitting || (user?.credits ?? 0) < contest.entry_fee}>
                          {submitting ? 'Unlocking...' : `Unlock for ${contest.entry_fee} credits`}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingContests.length === 0 ? (
               <div className="text-center py-12">
                 <Calendar className="h-12 w-12 mx-auto text-white/50 mb-4" />
                 <h3 className="text-lg font-semibold mb-2 text-white">No Upcoming Contests</h3>
                 <p className="text-white/70">New contests are announced periodically. Stay tuned!</p>
               </div>
            ) : (
              <div className="space-y-3">
                {upcomingContests.map((contest) => (
                  <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-grow mx-4 min-w-0">
                      <p className="font-semibold truncate text-white">{contest.title}</p>
                      <p className="text-sm text-white/70 line-clamp-1">{contest.description}</p>
                       <div className="flex items-center gap-4 mt-1 text-xs text-white/70">
                         <div className="flex items-center gap-1"><Trophy className="h-4 w-4" /><span>Prize: {contest.prize}</span></div>
                         <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Starts: <Countdown to={contest.start_date} /></span></div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastContests.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-white/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No Past Contests</h3>
                <p className="text-white/70">View results from previous contests here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastContests.map((contest) => (
                   <div key={contest.id} className="flex items-center p-3 rounded-lg bg-black/20 opacity-70">
                     <div className="flex-grow mx-4 min-w-0">
                       <p className="font-semibold truncate text-white/70">{contest.title}</p>
                       <p className="text-sm text-white/50 line-clamp-1">{contest.description}</p>
                       <div className="flex items-center gap-4 mt-1 text-xs text-white/50">
                         <div className="flex items-center gap-1"><Trophy className="h-4 w-4" /><span>Prize: {contest.prize}</span></div>
                         <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Ended: {new Date(contest.end_date).toLocaleDateString()}</span></div>
                       </div>
                     </div>
                   </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-4">
            {activeContests.length === 0 ? (
              <div className="text-center py-12">
                <Vote className="h-12 w-12 mx-auto text-white/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                <p className="text-white/70">There are no active contests to show entries for.</p>
              </div>
            ) : (
              <Tabs value={activeContestTab} onValueChange={setActiveContestTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  {activeContests.map(c => (
                    <TabsTrigger key={c.id} value={c.id}>
                      {c.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {activeContests.map(c => (
                  <TabsContent key={c.id} value={c.id} className="mt-4">
                    <div className="mb-4">
                      <Input
                        type="search"
                        placeholder="Search for a contestant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {entriesLoading ? (
                      <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div></div>
                    ) : contestEntries.filter(e => e.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <div className="text-center py-10">
                        <p>No entries found for this contest {searchTerm && 'matching your search'}.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contestEntries
                          .filter(e => e.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((entry) => (
                            <div key={entry.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                              <Button variant="ghost" size="icon" onClick={() => handlePlay(entry.songs)}>
                                {currentTrack?.id === entry.songs?.id && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                              </Button>
                              <div className="flex-grow mx-4 min-w-0">
                                <p className="font-semibold truncate">{entry.songs?.title || 'Contest Entry'}</p>
                                <p className="text-sm text-white/70">By {entry.profiles?.full_name || 'Unknown Artist'}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-white"><Vote className="h-4 w-4" /><span>{entry.vote_count}</span></div>
                                <Button variant="outline" size="sm" onClick={() => handleVoteClick(entry)} disabled={isVoting}>
                                  Vote
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
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
          userCredits={user?.credits ?? 0}
          isVoting={isVoting}
        />
      )}

      {selectedContest && (
        <SubmissionDialog
          open={submissionDialogOpen}
          onOpenChange={setSubmissionDialogOpen}
          contestId={selectedContest.id}
          onSubmissionSuccess={() => {
            toast.success('Your entry has been submitted for review.');
            refreshEntries();
          }}
        />
      )}
    </div>
  );
};

export default Contest;
