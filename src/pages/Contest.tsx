
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, Upload, Play, Pause, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContestEntryCard from "@/components/contest/ContestEntryCard";
import { useContestSubmission } from "@/hooks/useContestSubmission";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ensureStorageBuckets } from "@/utils/storageSetup";

interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  prize_amount: number;
  prize_currency: string;
  start_date: string;
  end_date: string;
  status: string;
  rules: string;
  entry_fee: number;
  max_entries_per_user: number;
  voting_enabled: boolean;
}

interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  song_id: string | null;
  video_url: string | null;
  description: string | null;
  status: string;
  approved: boolean;
  vote_count: number;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
  };
  songs?: {
    title: string;
    audio_url: string;
  };
}

const Contest = () => {
  const { user, isVoter } = useAuth();
  const { submitEntry, isSubmitting } = useContestSubmission();
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    videoFile: null as File | null,
    description: ''
  });

  useEffect(() => {
    fetchContests();
    ensureStorageBuckets();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      fetchContestEntries(selectedContest.id);
    }
  }, [selectedContest]);

  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContests(data || []);
      
      // Select first contest by default
      if (data && data.length > 0) {
        setSelectedContest(data[0]);
      }
    } catch (error: any) {
      console.error('Error fetching contests:', error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const fetchContestEntries = async (contestId: string) => {
    try {
      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username
          ),
          songs:song_id (
            title,
            audio_url
          )
        `)
        .eq('contest_id', contestId)
        .eq('approved', true)
        .order('vote_count', { ascending: false });

      if (error) throw error;
      setContestEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
      toast.error('Failed to load contest entries');
    }
  };

  const handleSubmitEntry = async () => {
    if (!selectedContest || !user) return;

    if (!submissionForm.videoFile) {
      toast.error('Please select a video file to upload');
      return;
    }

    const success = await submitEntry({
      contestId: selectedContest.id,
      videoFile: submissionForm.videoFile,
      description: submissionForm.description
    });

    if (success) {
      setShowSubmissionDialog(false);
      setSubmissionForm({ videoFile: null, description: '' });
      // Refresh entries
      fetchContestEntries(selectedContest.id);
      toast.success('Contest entry submitted successfully!');
    }
  };

  const handleVote = async (entryId: string) => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      // Check if user already voted for this entry
      const { data: existingVote } = await supabase
        .from('contest_votes')
        .select('id')
        .eq('contest_entry_id', entryId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        toast.error('You have already voted for this entry');
        return;
      }

      // Submit vote
      const { error } = await supabase
        .from('contest_votes')
        .insert({
          contest_id: selectedContest?.id,
          contest_entry_id: entryId,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Vote submitted successfully!');
      // Refresh entries to show updated vote count
      if (selectedContest) {
        fetchContestEntries(selectedContest.id);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to submit vote');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading contests...</span>
      </div>
    );
  }

  if (contests.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Active Contests</h2>
        <p className="text-muted-foreground">Check back later for new contests!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Music Contests
        </h1>
        <p className="text-muted-foreground">
          Participate in exciting music contests and showcase your talent!
        </p>
      </div>

      {/* Contest Selection */}
      <div className="grid gap-4">
        {contests.map((contest) => (
          <Card 
            key={contest.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedContest?.id === contest.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedContest(contest)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{contest.title}</CardTitle>
                  <CardDescription className="mt-2">{contest.description}</CardDescription>
                </div>
                <Badge variant="default">{contest.status}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(contest.start_date).toLocaleDateString()} - {new Date(contest.end_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {contest.prize_amount ? `${contest.prize_currency} ${contest.prize_amount.toLocaleString()}` : contest.prize}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedContest && (
        <div className="space-y-6">
          {/* Contest Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Contest Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              {user && (
                <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Submit Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit Contest Entry</DialogTitle>
                      <DialogDescription>
                        Upload your video entry for "{selectedContest.title}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="video">Video File (MP4, MOV, AVI)</Label>
                        <Input
                          id="video"
                          type="file"
                          accept="video/*"
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            videoFile: e.target.files?.[0] || null
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="Tell us about your entry..."
                          value={submissionForm.description}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            description: e.target.value
                          })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleSubmitEntry} 
                        disabled={isSubmitting || !submissionForm.videoFile}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Entry'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {!user && (
                <p className="text-muted-foreground">Please log in to submit an entry</p>
              )}
            </CardContent>
          </Card>

          {/* Contest Entries List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contest Entries ({contestEntries.length})
                </CardTitle>
                {selectedContest.voting_enabled && (
                  <Badge variant="secondary">Voting Enabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {contestEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No entries yet. Be the first to submit!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contestEntries.map((entry, index) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <h3 className="font-semibold">
                              {entry.profiles?.full_name || entry.profiles?.username || 'Anonymous'}
                            </h3>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>{entry.vote_count}</span>
                          </div>
                          {selectedContest.voting_enabled && user && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVote(entry.id)}
                            >
                              Vote
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {entry.video_url && (
                        <div className="aspect-video">
                          <video
                            controls
                            className="w-full h-full rounded-md"
                            src={entry.video_url}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                      
                      {entry.songs && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <Music className="h-4 w-4" />
                          <span className="text-sm font-medium">{entry.songs.title}</span>
                          {entry.songs.audio_url && (
                            <audio controls className="ml-auto">
                              <source src={entry.songs.audio_url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Submitted on {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Contest;
