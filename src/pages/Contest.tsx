import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, ThumbsUp, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  prize: string;
  rules: string;
  voting_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ContestEntry {
  id: string;
  song_id: string | null;
  description: string | null;
  vote_count: number;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
  };
  song: {
    id: string;
    title: string;
    artist: string;
    audio_url: string;
    cover_url: string;
  } | null;
  media_type: 'audio' | 'video';
  video_url: string | null;
  approved: boolean;
}

interface ContestEntryCardProps {
  entry: ContestEntry;
  onVote: (entryId: string) => Promise<void>;
  canVote: boolean;
  hasVoted: boolean;
}

const ContestEntryCard: React.FC<ContestEntryCardProps> = ({ entry, onVote, canVote, hasVoted }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {entry.song?.title || 'No Title'}
          <div className="flex items-center space-x-2">
            {canVote && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onVote(entry.id)}
                disabled={hasVoted}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                {hasVoted ? 'Voted' : 'Vote'}
              </Button>
            )}
            <Badge variant="secondary">Votes: {entry.vote_count}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>By: {entry.user.full_name || entry.user.username || 'Anonymous'}</p>
        <p>{entry.description || 'No description'}</p>
        {entry.song && (
          <audio controls src={entry.song.audio_url}>
            Your browser does not support the audio element.
          </audio>
        )}
      </CardContent>
    </Card>
  );
};

const Contest = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [songId, setSongId] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const [votedEntries, setVotedEntries] = useState<string[]>([]);

  const fetchContest = useCallback(async () => {
    if (!contestId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', contestId)
        .single();

      if (error) {
        console.error('Error fetching contest:', error);
        toast.error('Failed to load contest details');
      } else {
        setContest(data);
      }
    } catch (error) {
      console.error('Error fetching contest:', error);
      toast.error('Failed to load contest details');
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  const fetchContestEntries = useCallback(async (contestId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          id,
          song_id,
          description,
          vote_count,
          approved,
          user:profiles (
            id,
            full_name,
            username
          ),
          song:songs (
            id,
            title,
            artist,
            audio_url,
            cover_url
          ),
          media_type,
          video_url
        `)
        .eq('contest_id', contestId);

      if (error) {
        console.error('Error fetching contest entries:', error);
        toast.error('Failed to load contest entries');
      } else {
        setEntries(data || []);
      }
    } catch (error) {
      console.error('Error fetching contest entries:', error);
      toast.error('Failed to load contest entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVotedEntries = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contest_votes')
        .select('contest_entry_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching voted entries:', error);
      } else {
        const votedIds = data?.map(vote => vote.contest_entry_id) || [];
        setVotedEntries(votedIds);
      }
    } catch (error) {
      console.error('Error fetching voted entries:', error);
    }
  }, [user]);

  const handleVote = async (entryId: string) => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('contest_votes')
        .insert([{ user_id: user.id, contest_entry_id: entryId }]);

      if (error) {
        console.error('Error submitting vote:', error);
        toast.error('Failed to submit vote');
      } else {
        toast.success('Vote submitted successfully');
        setVotedEntries(prev => [...prev, entryId]);
        setEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === entryId ? { ...entry, vote_count: entry.vote_count + 1 } : entry
          )
        );
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast.error('Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
    if (contestId) {
      fetchContestEntries(contestId);
    }
    fetchVotedEntries();
  }, [contestId, fetchContest, fetchContestEntries, fetchVotedEntries]);

  const submitEntry = async (contestId: string, songId?: string, description?: string) => {
    if (!user) {
      toast.error('Please log in to submit an entry');
      return false;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('submit_contest_entry', {
        p_contest_id: contestId,
        p_song_id: songId,
        p_description: description || ''
      });

      if (error) throw error;

      // Type assertion for the response data
      const response = data as { success: boolean; message: string };
      
      if (response.success) {
        toast.success(response.message);
        await fetchContestEntries(contestId);
        return true;
      } else {
        toast.error(response.message);
        return false;
      }
    } catch (error: any) {
      console.error('Error submitting entry:', error);
      toast.error(error.message || 'Failed to submit entry');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading contest details...</div>;
  }

  if (!contest) {
    return <div className="container mx-auto py-8 px-4">Contest not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{contest.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{contest.description}</p>
          <p>Start Date: {new Date(contest.start_date).toLocaleDateString()}</p>
          <p>End Date: {new Date(contest.end_date).toLocaleDateString()}</p>
          <p>Prize: {contest.prize}</p>
          <p>Rules: {contest.rules}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit Your Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Submit Entry</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Submit Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="songId" className="text-right">
                    Song ID
                  </Label>
                  <Input
                    id="songId"
                    value={songId}
                    onChange={(e) => setSongId(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <Button onClick={async () => {
                if (contestId) {
                  const success = await submitEntry(contestId, songId, description);
                  if (success) {
                    setOpen(false);
                  }
                }
              }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Entry'
                )}
              </Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Contest Entries
            <Badge variant="secondary">{entries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries yet. Be the first to participate!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <ContestEntryCard
                  key={entry.id}
                  entry={{
                    id: entry.id,
                    song_id: entry.song_id,
                    description: entry.description,
                    vote_count: entry.vote_count,
                    user: {
                      id: entry.user.id,
                      full_name: entry.user.full_name,
                      username: entry.user.username
                    },
                    song: entry.song || null,
                    media_type: entry.media_type,
                    video_url: entry.video_url,
                    approved: entry.approved
                  }}
                  onVote={handleVote}
                  canVote={contest?.voting_enabled}
                  hasVoted={votedEntries.includes(entry.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contest;
