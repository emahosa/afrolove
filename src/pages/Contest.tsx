import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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

const Countdown = ({ date }: { date: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const countdownDate = new Date(date).getTime();
      const distance = countdownDate - now;

      if (distance < 0) {
        setTimeLeft('Started!');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [date]);

  return <span className="text-sm font-mono">{timeLeft}</span>;
};


const ContestCard = ({ contest, onActionClick }: { contest: Contest, onActionClick: (contest: Contest) => void }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'upcoming': return <Badge variant="secondary">Upcoming</Badge>;
      case 'closed': return <Badge variant="destructive">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderActionButton = () => {
    if (contest.status === 'active') {
      if (contest.entry_fee > 0 && !contest.is_unlocked) {
        return (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold" onClick={() => onActionClick(contest)}>
            Unlock ({contest.entry_fee} credits)
          </Button>
        );
      }
      return (
        <Button size="sm" className="bg-dark-purple hover:bg-opacity-90 font-bold" onClick={() => onActionClick(contest)}>
          Submit Entry
        </Button>
      );
    }
    if (contest.status === 'upcoming') {
      return <Countdown date={contest.start_date} />;
    }
    return null;
  };

  return (
    <div key={contest.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex-grow mx-4 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate text-white">{contest.title}</p>
          {getStatusBadge(contest.status)}
        </div>
        <p className="text-sm text-gray-400 line-clamp-1">{contest.description}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-dark-purple" />
            <span>Prize: {contest.prize}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(contest.start_date).toLocaleDateString()} - {new Date(contest.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {renderActionButton()}
      </div>
    </div>
  );
};


const Contest = () => {
  const { user } = useAuth();
  const {
    upcomingContests,
    activeContests,
    pastContests,
    allContestEntries,
    loading,
    isVoting,
    castVote,
    checkHasFreeVote,
    unlockContest,
    submitEntry,
  } = useContest();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [userHasFreeVote, setUserHasFreeVote] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user && selectedEntry) {
      checkHasFreeVote(selectedEntry.contest_id).then(setUserHasFreeVote);
    }
  }, [user, selectedEntry, checkHasFreeVote]);


  const handleActionClick = async (contest: Contest) => {
    if (contest.status !== 'active') return;

    if (contest.entry_fee > 0 && !contest.is_unlocked) {
      const success = await unlockContest(contest.id, contest.entry_fee);
      if (success) {
        toast.success("Contest unlocked! You can now submit your entry.");
      }
    } else {
      setSelectedContest(contest);
      setSubmissionDialogOpen(true);
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

  const handlePlay = (entry: ContestEntry) => {
    if (!entry.video_url) return;

    if (currentTrack?.id === entry.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: entry.id,
        title: `Entry by ${entry.profiles?.full_name || 'Unknown Artist'}`,
        audio_url: entry.video_url,
      });
    }
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

      <Tabs defaultValue="contests" className="w-full flex flex-col flex-grow mt-6">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="contests" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">All Contests</TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">Entries</TabsTrigger>
        </TabsList>

        <div className="flex-grow overflow-y-auto mt-6">
          <TabsContent value="contests" className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">Active Contests</h2>
              {activeContests.length > 0 ? (
                <div className="space-y-3">
                  {activeContests.map((contest) => <ContestCard key={contest.id} contest={contest} onActionClick={handleActionClick} />)}
                </div>
              ) : (
                <p className="text-gray-400">No active contests at the moment.</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">Upcoming</h2>
              {upcomingContests.length > 0 ? (
                <div className="space-y-3">
                  {upcomingContests.map((contest) => <ContestCard key={contest.id} contest={contest} onActionClick={handleActionClick} />)}
                </div>
              ) : (
                <p className="text-gray-400">No upcoming contests scheduled.</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">Past Contests</h2>
              {pastContests.length > 0 ? (
                <div className="space-y-3">
                  {pastContests.map((contest) => <ContestCard key={contest.id} contest={contest} onActionClick={handleActionClick} />)}
                </div>
              ) : (
                <p className="text-gray-400">No past contests to show.</p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="entries" className="space-y-4">
            {activeContests.length === 0 ? (
              <Card className="text-center py-12 bg-white/5 border-white/10">
                <CardContent>
                  <Vote className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">No Active Contests</h3>
                  <p className="text-gray-400">
                    There are no active contests to show entries for.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue={activeContests[0].id} className="w-full">
                <TabsList>
                  {activeContests.map((contest) => (
                    <TabsTrigger key={contest.id} value={contest.id}>{contest.title}</TabsTrigger>
                  ))}
                </TabsList>
                <div className="mt-4">
                  <Input
                    placeholder="Search for a user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/20 border-white/20"
                  />
                </div>
                {activeContests.map((contest) => {
                  const entries = allContestEntries[contest.id] || [];
                  const filteredEntries = entries.filter(entry =>
                    entry.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    entry.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  return (
                    <TabsContent key={contest.id} value={contest.id}>
                      {filteredEntries.length > 0 ? (
                        <div className="space-y-3 mt-4">
                          {filteredEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                              <Button variant="ghost" size="icon" onClick={() => handlePlay(entry)} className="text-gray-300 hover:text-white">
                                {currentTrack?.id === entry.id && isPlaying ? (
                                  <Pause className="h-5 w-5 text-dark-purple" />
                                ) : (
                                  <Play className="h-5 w-5" />
                                )}
                              </Button>
                              <div className="flex-grow mx-4 min-w-0">
                                <p className="font-semibold truncate">
                                  {/* This part needs to be adapted based on final entry data structure */}
                                  Entry by {entry.profiles?.full_name || 'Unknown Artist'}
                                </p>
                                <p className="text-sm text-gray-400">@{entry.profiles?.username || 'unknown'}</p>
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
                      ) : (
                        <p className="text-gray-400 mt-4">No entries found for this contest{searchQuery && ' matching your search'}.</p>
                      )}
                    </TabsContent>
                  );
                })}
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
          userCredits={user?.profile?.credits ?? 0}
          isVoting={isVoting}
        />
      )}

      {submissionDialogOpen && selectedContest && (
        <SubmissionDialog
          contest={selectedContest}
          onClose={() => setSubmissionDialogOpen(false)}
          onSubmit={async (file, description, title) => {
            const success = await submitEntry(selectedContest.id, file, description, title);
            if (success) {
              setSubmissionDialogOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

const SubmissionDialog = ({ contest, onClose, onSubmit }: { contest: Contest, onClose: () => void, onSubmit: (file: File, description: string, title: string) => Promise<void> }) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Please provide a title and a file.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit(file, description, title);
    setIsSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Submit to {contest.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Entry Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-gray-700 border-gray-600" />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-gray-700 border-gray-600" />
          </div>
          <div>
            <Label htmlFor="file">Audio/Video File</Label>
            <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-gray-700 border-gray-600" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Contest;
