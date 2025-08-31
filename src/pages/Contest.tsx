import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Vote, Play, Pause, Lock, Unlock, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";
import { Input } from "@/components/ui/input";
import { ContestEntry } from "@/hooks/use-contest";

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

const Countdown = ({ date }: { date: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const countdownDate = new Date(date).getTime();
      const distance = countdownDate - now;

      if (distance < 0) {
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [date]);

  return (
    <div className="flex items-center gap-2 text-sm text-yellow-400">
      <span>{String(timeLeft.days).padStart(2, '0')}d</span>
      <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
      <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
      <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
    </div>
  );
};

const ContestList = ({ contests, type, onSubmission, onUnlock }: { contests: Contest[], type: 'upcoming' | 'active' | 'past', onSubmission: (c: Contest) => void, onUnlock: (c: Contest) => void }) => {
  if (contests.length === 0) {
    return (
      <Card className="text-center py-12 bg-white/5 border-white/10">
        <CardContent>
          <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">No {type} contests</h3>
          <p className="text-gray-400">Check back later for new contests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contests.map((contest) => (
        <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <div className="flex-grow mx-4 min-w-0">
            <p className="font-semibold truncate text-white">{contest.title}</p>
            <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-dark-purple" />
                <span>Prize: {contest.prize}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {type === 'upcoming' && <span>Starts in: <Countdown date={contest.start_date} /></span>}
                {type === 'active' && <span>Ends: {new Date(contest.end_date).toLocaleDateString()}</span>}
                {type === 'past' && <span>Ended: {new Date(contest.end_date).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {type === 'active' && (
              contest.is_unlocked ? (
                <Button size="sm" className="bg-dark-purple hover:bg-opacity-90 font-bold" onClick={() => onSubmission(contest)}>
                  Submit Entry
                </Button>
              ) : (
                <Button size="sm" className="bg-green-500 hover:bg-green-600 font-bold" onClick={() => onUnlock(contest)}>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock ({contest.entry_fee} credits)
                </Button>
              )
            )}
            {type === 'upcoming' && <Badge variant="outline">Upcoming</Badge>}
            {type === 'past' && <Badge variant="secondary">Closed</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
};


const Contest = () => {
  const { user } = useAuth();
  const {
    upcomingContests,
    activeContests,
    pastContests,
    loading,
    isVoting,
    castVote,
    checkHasFreeVote,
    unlockContest,
    fetchContestEntries,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const [entriesLoading, setEntriesLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);

  const [entrySearchTerm, setEntrySearchTerm] = useState('');
  const [selectedEntryTab, setSelectedEntryTab] = useState<string | undefined>(activeContests[0]?.id);
  const [currentContestEntries, setCurrentContestEntries] = useState<ContestEntry[]>([]);

  useEffect(() => {
    if (activeContests.length > 0 && !selectedEntryTab) {
      setSelectedEntryTab(activeContests[0].id);
    }
  }, [activeContests, selectedEntryTab]);

  useEffect(() => {
    if (selectedEntryTab) {
      setEntriesLoading(true);
      fetchContestEntries(selectedEntryTab)
        .then(setCurrentContestEntries)
        .finally(() => setEntriesLoading(false));
    } else {
      setEntriesLoading(false);
      setCurrentContestEntries([]);
    }
  }, [selectedEntryTab, fetchContestEntries]);

  useEffect(() => {
    if (user && selectedEntry) {
      checkHasFreeVote(selectedEntry.contest_id).then(setUserHasFreeVote);
    }
  }, [user, selectedEntry, checkHasFreeVote]);

  const handlePlay = (entry: ContestEntry) => {
    if (!entry.video_url) return;
    if (currentTrack?.id === entry.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: entry.id,
        title: `Entry by ${entry.profiles?.full_name || 'Unknown'}`,
        audio_url: entry.video_url
      });
    }
  };

  const openSubmissionDialog = (contest: Contest) => {
    setSelectedContest(contest);
    setSubmissionDialogOpen(true);
  };

  const handleUnlockContest = async (contest: Contest) => {
    if (!user) {
      toast.info("Please log in to unlock contests.");
      return;
    }
    const success = await unlockContest(contest.id, contest.entry_fee);
    if (success) {
      toast.success("Contest unlocked! You can now submit your entry.");
    }
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

  const filteredEntries = currentContestEntries.filter(entry =>
    entry.profiles?.full_name?.toLowerCase().includes(entrySearchTerm.toLowerCase()) ||
    (entry.profiles as any)?.username?.toLowerCase().includes(entrySearchTerm.toLowerCase())
  );

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
        <p className="text-gray-400">Showcase your talent and win amazing prizes!</p>
      </div>

      <Tabs defaultValue="contests" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="contests" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Contests</TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Entries</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6">
          <TabsContent value="contests" className="space-y-4">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/20 border-white/5">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                <ContestList contests={activeContests} type="active" onSubmission={openSubmissionDialog} onUnlock={handleUnlockContest} />
              </TabsContent>
              <TabsContent value="upcoming" className="mt-4">
                <ContestList contests={upcomingContests} type="upcoming" onSubmission={openSubmissionDialog} onUnlock={handleUnlockContest} />
              </TabsContent>
              <TabsContent value="past" className="mt-4">
                <ContestList contests={pastContests} type="past" onSubmission={openSubmissionDialog} onUnlock={handleUnlockContest} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="entries" className="space-y-2">
            {activeContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Vote className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                  <p className="text-gray-400">There are no active contests to show entries for.</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={selectedEntryTab} onValueChange={setSelectedEntryTab} className="w-full">
                <TabsList>
                  {activeContests.map(c => <TabsTrigger key={c.id} value={c.id}>{c.title}</TabsTrigger>)}
                </TabsList>
                <div className="relative my-4">
                  <Input
                    placeholder="Search for a contestant..."
                    value={entrySearchTerm}
                    onChange={e => setEntrySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

                {activeContests.map(c => (
                  <TabsContent key={c.id} value={c.id}>
                    {entriesLoading ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
                        <span className="ml-2">Loading entries...</span>
                      </div>
                    ) : filteredEntries.length === 0 ? (
                      <Card className="text-center py-12 bg-white/5 border-white/10">
                        <CardContent>
                          <Vote className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2 text-white">No Entries Yet</h3>
                          <p className="text-gray-400">Be the first to submit an entry!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {filteredEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <Button variant="ghost" size="icon" onClick={() => handlePlay(entry)} className="text-gray-300 hover:text-white">
                              {currentTrack?.id === entry.id && isPlaying ? <Pause className="h-5 w-5 text-dark-purple" /> : <Play className="h-5 w-5" />}
                            </Button>
                            <div className="flex-grow mx-4 min-w-0">
                              <p className="font-semibold truncate">{entry.description || 'Contest Entry'}</p>
                              <p className="text-sm text-gray-400">By {entry.profiles?.full_name || 'Unknown Artist'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm text-white">
                                <Vote className="h-4 w-4 text-dark-purple" />
                                <span>{entry.vote_count}</span>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleVoteClick(entry)} disabled={isVoting} className="bg-transparent border-white/30 hover:bg-white/10 text-white">
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
          entryTitle={selectedEntry.description || 'this entry'}
          userHasFreeVote={userHasFreeVote}
          userCredits={user?.profile?.credits ?? 0}
          isVoting={isVoting}
        />
      )}
    </div>
  );
};

export default Contest;
