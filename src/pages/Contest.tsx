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
import { useContest, Contest as ContestType, ContestEntry } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";
import { SubmissionDialog } from "@/components/contest/SubmissionDialog";
import { WinnerCard } from "@/components/contest/WinnerCard";
import { WinnerClaimDialog } from "@/components/contest/WinnerClaimDialog";

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
  const [selectedContest, setSelectedContest] = useState<ContestType | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);
  const [activeContestTab, setActiveContestTab] = useState<string | undefined>(activeContests[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWinnerClaim, setShowWinnerClaim] = useState(false);
  const [winnerClaimData, setWinnerClaimData] = useState<{ contestId: string; winnerRank: number } | null>(null);
  const [userWins, setUserWins] = useState<Array<{ contest_id: string; rank: number }>>([]);
  const [visibleRules, setVisibleRules] = useState<string | null>(null);

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
      checkUserWins();
    }
  }, [user]);

  // Check if user has any wins and show claim dialog
  const checkUserWins = async () => {
    if (!user) return;

    try {
      const { data: wins, error } = await supabase
        .from('contest_winners')
        .select('contest_id, rank')
        .eq('user_id', user.id);

      if (error) throw error;

      if (wins && wins.length > 0) {
        setUserWins(wins);
        
        // Check if user has submitted claim details for any win
        const { data: existingClaims, error: claimsError } = await supabase
          .from('winner_claim_details')
          .select('contest_id')
          .eq('user_id', user.id);

        if (claimsError) throw claimsError;

        const claimedContestIds = existingClaims?.map(claim => claim.contest_id) || [];
        const unclaimedWin = wins.find(win => !claimedContestIds.includes(win.contest_id));

        if (unclaimedWin) {
          setWinnerClaimData({
            contestId: unclaimedWin.contest_id,
            winnerRank: unclaimedWin.rank
          });
          setShowWinnerClaim(true);
        }
      }
    } catch (error: any) {
      console.error('Error checking user wins:', error);
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

  const handlePlay = (song: any) => {
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
      toast.info('Please log in to unlock the contest.');
      return;
    }
    await unlockContest(contest.id, contest.entry_fee);
  };

  const canParticipate = isVoter() || isSubscriber() || userRoles.includes('admin') || userRoles.includes('super_admin');

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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

const PastContestCard = ({ contest }: { contest: ContestType }) => {
  const [winners, setWinners] = useState<ContestEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      setIsLoading(true);
      try {
        // Step 1: Fetch contest winners and their corresponding entries
        const { data: winnerData, error: winnersError } = await supabase
          .from('contest_winners')
          .select('*, contest_entries(*)')
          .eq('contest_id', contest.id)
          .order('rank', { ascending: true });

        if (winnersError) {
          throw winnersError;
        }

        if (winnerData) {
          // Step 2: Extract entry details from the response
          const entries = winnerData
            .map(winner => winner.contest_entries)
            .filter(entry => entry !== null) as unknown as ContestEntry[];

          // Step 3: Fetch profile information for all winners efficiently
          const userIds = entries.map(entry => entry.user_id).filter(id => !!id);

          const profilesMap = new Map();
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .in('id', userIds);

            if (profilesError) {
              console.error('Error fetching profiles in bulk:', profilesError);
            } else {
              profilesData.forEach(p => profilesMap.set(p.id, { full_name: p.full_name, username: p.username }));
            }
          }

          const winnersWithProfiles = entries.map(entry => ({
            ...entry,
            profiles: entry.user_id ? profilesMap.get(entry.user_id) || null : null,
          }));

          setWinners(winnersWithProfiles);
        } else {
          setWinners([]);
        }
      } catch (error) {
        console.error("Error fetching winners from contest_winners", error);
        setWinners([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWinners();
  }, [contest]);

  const renderWinnerSection = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-dark-purple"></div>
        </div>
      );
    }

    if (winners.length > 0) {
      return (
        <div className="space-y-4">
          {winners.map((winner) => (
            <WinnerCard key={winner.id} winner={winner} contest={contest} />
          ))}
        </div>
      );
    }

    const now = new Date();
    const announcementDate = contest.winner_announced_at ? new Date(contest.winner_announced_at) : null;
    if (announcementDate && now < announcementDate) {
      return (
        <div className="text-center py-6 text-gray-400">
          <p>Winners will be announced on {announcementDate.toLocaleDateString()}.</p>
        </div>
      );
    }

    return (
      <div className="text-center py-6 text-gray-400">
        <p>No winners were declared for this contest.</p>
      </div>
    );
  };

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">{contest.title}</p>
          <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
        </div>
        <div className="text-xs text-gray-400">
          Ended: {new Date(contest.end_date).toLocaleDateString()}
        </div>
      </div>
      <div className="mt-4">
        {renderWinnerSection()}
      </div>
    </div>
  );
};

  return (
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="text-center flex-shrink-0">
        <h1 className="text-3xl font-semibold mb-2 text-white">Music Contests</h1>
        <p className="text-gray-400">
          Showcase your talent and win amazing prizes!
        </p>
        {user && (
          <p className="text-sm text-gray-300 mt-2">
            Your Credits: <span className="font-bold text-dark-purple">{user?.credits ?? 'Loading...'}</span>
          </p>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="active" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Active</TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Upcoming</TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Past</TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Entries</TabsTrigger>
          <TabsTrigger value="winners" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Winners</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6">
          <TabsContent value="active" className="space-y-4">
            {activeContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                  <p className="text-gray-400">Check back later for new contests.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeContests.map((contest) => (
                  <div key={contest.id} className="p-3 rounded-lg bg-white/5 border border-transparent hover:border-white/10 transition-all">
                    <div className="flex items-center">
                      <div className="flex-grow mx-4 min-w-0">
                        <p className="font-semibold truncate text-white">{contest.title}</p>
                        <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1"><Trophy className="h-4 w-4 text-dark-purple" /><span>Prize: {contest.prize}</span></div>
                          <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Ends: {new Date(contest.end_date).toLocaleDateString()}</span></div>
                          {contest.rules && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-xs p-0 h-auto text-dark-purple hover:text-opacity-80"
                              onClick={() => setVisibleRules(visibleRules === contest.id ? null : contest.id)}
                            >
                              {visibleRules === contest.id ? 'Hide Rules' : 'View Rules'}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {contest.is_unlocked ? (
                          <Button size="sm" className="bg-dark-purple hover:bg-opacity-90 font-bold" onClick={() => openSubmissionDialog(contest)}>
                            Submit Entry
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleUnlockContest(contest)} disabled={submitting || (user?.credits ?? 0) < contest.entry_fee}>
                            {submitting ? 'Unlocking...' : `Unlock for ${contest.entry_fee} credits`}
                          </Button>
                        )}
                      </div>
                    </div>
                    {visibleRules === contest.id && contest.rules && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <h4 className="font-semibold text-white mb-1">Contest Rules</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{contest.rules}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingContests.length === 0 ? (
               <Card className="text-center py-12 bg-white/5 border-white/10">
                 <CardContent>
                   <Calendar className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                   <h3 className="text-lg font-semibold mb-2 text-white">No Upcoming Contests</h3>
                   <p className="text-gray-400">New contests are announced periodically. Stay tuned!</p>
                 </CardContent>
               </Card>
            ) : (
              <div className="space-y-3">
                {upcomingContests.map((contest) => (
                  <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex-grow mx-4 min-w-0">
                      <p className="font-semibold truncate text-white">{contest.title}</p>
                      <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
                       <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                         <div className="flex items-center gap-1"><Trophy className="h-4 w-4 text-dark-purple" /><span>Prize: {contest.prize}</span></div>
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
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Past Contests</h3>
                  <p className="text-gray-400">View results from previous contests here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pastContests.map((contest) => (
                  <PastContestCard key={contest.id} contest={contest} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-4">
            {activeContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Vote className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                  <p className="text-gray-400">There are no active contests to show entries for.</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={activeContestTab} onValueChange={setActiveContestTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/20">
                  {activeContests.map(c => (
                    <TabsTrigger key={c.id} value={c.id} className="data-[state=active]:bg-dark-purple/70 data-[state=active]:text-white">
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
                        className="bg-white/5 border-white/20 placeholder:text-gray-400"
                      />
                    </div>
                    {entriesLoading ? (
                      <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div></div>
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
                               <Button variant="ghost" size="icon" onClick={() => handlePlay(entry)} className="text-gray-300 hover:text-white">
                                 {currentTrack?.id === entry.id && isPlaying ? <Pause className="h-5 w-5 text-dark-purple" /> : <Play className="h-5 w-5" />}
                               </Button>
                               <div className="flex-grow mx-4 min-w-0">
                                 <p className="font-semibold truncate">Contest Entry</p>
                                <p className="text-sm text-gray-400">By {entry.profiles?.full_name || 'Unknown Artist'}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-white"><Vote className="h-4 w-4 text-dark-purple" /><span>{entry.vote_count}</span></div>
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

          <TabsContent value="winners" className="space-y-4">
            <div className="space-y-6">
              {pastContests.map((contest) => (
                <PastContestCard key={contest.id} contest={contest} />
              ))}
              {pastContests.length === 0 && (
                <Card className="text-center py-12 bg-white/5 border-white/10">
                  <CardContent>
                    <Trophy className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No Winners Yet</h3>
                    <p className="text-gray-400">Winners will be displayed here once contests are completed.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {selectedEntry && (
        <VoteDialog
          open={voteDialogOpen}
          onOpenChange={setVoteDialogOpen}
          onVoteSubmit={handleVoteSubmit}
          entryTitle="this entry"
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

      {winnerClaimData && (
        <WinnerClaimDialog
          open={showWinnerClaim}
          onOpenChange={setShowWinnerClaim}
          contestId={winnerClaimData.contestId}
          winnerRank={winnerClaimData.winnerRank}
        />
      )}
    </div>
  );
};

export default Contest;
