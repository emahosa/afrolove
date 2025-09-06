import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Trophy, Calendar, Vote, Play, Pause } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useContest } from "@/hooks/use-contest";
import { VoteDialog } from "@/components/contest/VoteDialog";
import { SubmissionDialog } from "@/components/contest/SubmissionDialog";

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize: string;
  entry_fee: number;
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

const ContestPage = () => {
  const { user, loading: authLoading } = useAuth();
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

  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
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
    if (contest) setCurrentContest(contest);
  }, [activeContestTab, activeContests, setCurrentContest]);

  useEffect(() => {
    if (user && selectedEntry) {
      checkHasFreeVote(selectedEntry.contest_id).then(setUserHasFreeVote);
    }
  }, [user, selectedEntry, checkHasFreeVote]);

  const handlePlay = (song: ContestEntry['songs']) => {
    if (!song?.audio_url) return;
    if (currentTrack?.id === song.id) {
      togglePlayPause();
    } else {
      playTrack({ id: song.id, title: song.title, audio_url: song.audio_url });
    }
  };

  const handleVoteClick = (entry: ContestEntry) => {
    if (!user) return toast.info('Please log in or register to vote.');
    if (entry.user_id === user.id) return toast.error('You cannot vote on your own entry.');
    setSelectedEntry(entry);
    setVoteDialogOpen(true);
  };

  if (authLoading || contestLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>;
  }

  const renderContestCard = (contest: Contest, type: 'active' | 'upcoming' | 'past') => (
    <Card key={contest.id} className="flex items-center p-4">
      <div className="flex-grow mx-4 min-w-0">
        <p className="font-semibold truncate">{contest.title}</p>
        <p className="text-sm text-white/70 line-clamp-1">{contest.description}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-white/70">
          <div className="flex items-center gap-1.5"><Trophy size={14} /><span>Prize: {contest.prize}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={14} />
            <span>
              {type === 'upcoming' && `Starts: ${new Date(contest.start_date).toLocaleDateString()}`}
              {type === 'active' && `Ends: ${new Date(contest.end_date).toLocaleDateString()}`}
              {type === 'past' && `Ended: ${new Date(contest.end_date).toLocaleDateString()}`}
            </span>
          </div>
        </div>
      </div>
      {type === 'active' && (
        <div className="flex items-center gap-4">
          {contest.is_unlocked ? (
            <Button size="sm" onClick={() => { setSelectedContest(contest); setSubmissionDialogOpen(true); }}>Submit Entry</Button>
          ) : (
            <Button size="sm" onClick={() => unlockContest(contest.id, contest.entry_fee)} disabled={submitting || (user?.credits ?? 0) < contest.entry_fee}>
              {submitting ? 'Unlocking...' : `Unlock for ${contest.entry_fee} credits`}
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Music Contests</h1>
        <p className="text-white/70 mt-2">Showcase your talent and win amazing prizes!</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="entries">Entries</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="active" className="space-y-4">
            {activeContests.length > 0 ? activeContests.map(c => renderContestCard(c, 'active')) : <p className="text-center text-white/70 py-10">No active contests.</p>}
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingContests.length > 0 ? upcomingContests.map(c => renderContestCard(c, 'upcoming')) : <p className="text-center text-white/70 py-10">No upcoming contests.</p>}
          </TabsContent>
          <TabsContent value="past" className="space-y-4">
            {pastContests.length > 0 ? pastContests.map(c => renderContestCard(c, 'past')) : <p className="text-center text-white/70 py-10">No past contests.</p>}
          </TabsContent>
          <TabsContent value="entries" className="space-y-4">
            {activeContests.length === 0 ? (
              <p className="text-center text-white/70 py-10">No active contests to show entries for.</p>
            ) : (
              <Tabs value={activeContestTab} onValueChange={setActiveContestTab} className="w-full">
                <TabsList className={`grid w-full grid-cols-${activeContests.length}`}>
                  {activeContests.map(c => <TabsTrigger key={c.id} value={c.id}>{c.title}</TabsTrigger>)}
                </TabsList>
                {activeContests.map(c => (
                  <TabsContent key={c.id} value={c.id} className="mt-4">
                    <Input type="search" placeholder="Search for a contestant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full mb-4" />
                    <div className="space-y-3">
                      {contestEntries.filter(e => e.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map((entry) => (
                        <Card key={entry.id} className="flex items-center p-3">
                          <Button variant="ghost" size="icon" onClick={() => handlePlay(entry.songs)}>
                            {currentTrack?.id === entry.songs?.id && isPlaying ? <Pause /> : <Play />}
                          </Button>
                          <div className="flex-grow mx-4 min-w-0">
                            <p className="font-semibold truncate">{entry.songs?.title || 'Contest Entry'}</p>
                            <p className="text-sm text-white/70">By {entry.profiles?.full_name || 'Unknown Artist'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm"><Vote size={16} /><span>{entry.vote_count}</span></div>
                            <Button variant="outline" size="sm" onClick={() => handleVoteClick(entry)} disabled={isVoting}>Vote</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {selectedEntry && (
        <VoteDialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen} onVoteSubmit={(votes) => castVote(selectedEntry.id, selectedEntry.contest_id, votes).then(() => setVoteDialogOpen(false))} entryTitle={selectedEntry.songs?.title || 'this entry'} userHasFreeVote={userHasFreeVote} userCredits={user?.credits ?? 0} isVoting={isVoting} />
      )}
      {selectedContest && (
        <SubmissionDialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen} contestId={selectedContest.id} onSubmissionSuccess={() => { toast.success('Your entry has been submitted for review.'); refreshEntries(); }} />
      )}
    </div>
  );
};

export default ContestPage;
