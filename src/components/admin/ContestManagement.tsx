import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, Check, X, Trophy, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  video_url: string;
  description: string;
  approved: boolean;
  vote_count: number;
  media_type: string;
  created_at: string;
  user_name?: string;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  start_date: string;
  end_date: string;
  status: string;
  instrumental_url?: string;
  rules?: string;
}

export const ContestManagement = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEndContestOpen, setIsEndContestOpen] = useState(false);
  const [isChooseWinnerOpen, setIsChooseWinnerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating contest
  const [newContest, setNewContest] = useState({
    title: '',
    description: '',
    prize: '',
    rules: '',
    start_date: '',
    end_date: '',
    instrumental_url: ''
  });

  // Fetch contests
  const fetchContests = async () => {
    console.log('🔄 Fetching contests...');
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('❌ Contest query error:', queryError);
        throw queryError;
      }
      
      console.log(`✅ Successfully fetched ${data?.length || 0} contests`);
      setContests(data || []);
      
      // Auto-select first contest if none selected
      if (data && data.length > 0 && !selectedContest) {
        console.log('🎯 Auto-selecting first contest:', data[0].title);
        setSelectedContest(data[0]);
      }
      
    } catch (error: any) {
      console.error('💥 Error in fetchContests:', error);
      const errorMessage = error.message || 'Failed to fetch contests';
      setError(errorMessage);
      toast.error(errorMessage);
      setContests([]);
    }
  };

  // Fetch entries - Using only profiles table, no users table
  const fetchEntries = async (contestId: string) => {
    if (!contestId) {
      console.log('⚠️ No contest ID provided');
      setEntries([]);
      return;
    }
    
    try {
      setEntriesLoading(true);
      console.log(`🔄 Fetching entries for contest: ${contestId}`);
      
      // Step 1: Get contest entries (no joins to avoid permission issues)
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false });

      if (entriesError) {
        console.error('❌ Error fetching contest entries:', entriesError);
        throw entriesError;
      }

      console.log(`✅ Fetched ${entriesData?.length || 0} contest entries`);
      
      if (!entriesData || entriesData.length === 0) {
        setEntries([]);
        return;
      }
      
      // Step 2: Get unique user IDs from entries
      const userIds = [...new Set(entriesData.map(entry => entry.user_id))];
      console.log(`🔍 Fetching profiles for ${userIds.length} unique users`);
      
      // Step 3: Fetch profiles separately (no join, RLS-compliant)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      if (profilesError) {
        console.warn('⚠️ Error fetching profiles (continuing anyway):', profilesError);
      }

      console.log(`✅ Fetched ${profilesData?.length || 0} profiles`);

      // Step 4: Create a lookup map for profiles
      const profilesMap = new Map(
        (profilesData || []).map(profile => [
          profile.id, 
          profile.full_name || profile.username || 'Anonymous User'
        ])
      );

      // Step 5: Combine entries with profile info in code
      const entriesWithUserInfo = entriesData.map(entry => ({
        ...entry,
        user_name: profilesMap.get(entry.user_id) || 'Anonymous User'
      }));
      
      console.log(`✅ Combined ${entriesWithUserInfo.length} entries with profile data`);
      setEntries(entriesWithUserInfo);
      
    } catch (error: any) {
      console.error('💥 Error fetching entries:', error);
      const errorMessage = error.message || 'Failed to fetch entries';
      setError(errorMessage);
      toast.error(errorMessage);
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  // Approve entry
  const handleApproveEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('contest_entries')
        .update({ approved: true })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(entries.map(entry => 
        entry.id === entryId 
          ? { ...entry, approved: true } 
          : entry
      ));
      toast.success("Entry approved successfully");
    } catch (error: any) {
      console.error('Error approving entry:', error);
      toast.error('Failed to approve entry: ' + error.message);
    }
  };

  // Reject entry
  const handleRevokeEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('contest_entries')
        .update({ approved: false })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(entries.map(entry => 
        entry.id === entryId 
          ? { ...entry, approved: false } 
          : entry
      ));
      toast.success("Entry rejected successfully");
    } catch (error: any) {
      console.error('Error rejecting entry:', error);
      toast.error('Failed to reject entry: ' + error.message);
    }
  };

  // Create new contest
  const handleCreateContest = async () => {
    try {
      const { error } = await supabase
        .from('contests')
        .insert({
          ...newContest,
          status: 'active',
          terms_conditions: 'By submitting an entry, you acknowledge that you have read and agreed to these rules.'
        });

      if (error) throw error;

      toast.success("New contest created successfully");
      setIsCreateDialogOpen(false);
      setNewContest({
        title: '',
        description: '',
        prize: '',
        rules: '',
        start_date: '',
        end_date: '',
        instrumental_url: ''
      });
      fetchContests();
    } catch (error: any) {
      console.error('Error creating contest:', error);
      toast.error('Failed to create contest: ' + error.message);
    }
  };

  // End contest
  const confirmEndContest = async () => {
    if (!selectedContest) return;

    try {
      const { error } = await supabase
        .from('contests')
        .update({ status: 'completed' })
        .eq('id', selectedContest.id);

      if (error) throw error;

      toast.success("Contest ended successfully");
      setIsEndContestOpen(false);
      fetchContests();
    } catch (error: any) {
      console.error('Error ending contest:', error);
      toast.error('Failed to end contest: ' + error.message);
    }
  };

  // Choose winner
  const confirmChooseWinner = () => {
    if (selectedEntry) {
      toast.success(`${selectedEntry.user_name || 'User'} has been selected as the winner!`);
      setIsChooseWinnerOpen(false);
    }
  };

  useEffect(() => {
    console.log('🚀 ContestManagement component mounted');
    const loadData = async () => {
      setLoading(true);
      await fetchContests();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedContest) {
      console.log('🎯 Selected contest changed, fetching entries for:', selectedContest.title);
      fetchEntries(selectedContest.id);
    }
  }, [selectedContest]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-lg">Loading contests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Failed to load contests</p>
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchContests().finally(() => setLoading(false));
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contest Management</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => {
            setLoading(true);
            fetchContests().finally(() => setLoading(false));
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Contest
          </Button>
          {selectedContest && selectedContest.status === 'active' && (
            <Button variant="outline" onClick={() => setIsEndContestOpen(true)}>
              End Contest
            </Button>
          )}
        </div>
      </div>

      {/* Contest selector */}
      {contests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Contest</CardTitle>
            <CardDescription>Found {contests.length} contest(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contests.map((contest) => (
                <Button
                  key={contest.id}
                  variant={selectedContest?.id === contest.id ? "default" : "outline"}
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setSelectedContest(contest)}
                >
                  <div>
                    <div className="font-semibold">{contest.title}</div>
                    <div className="text-sm opacity-70">{contest.status}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Contests Found</h3>
            <p className="text-muted-foreground mb-4">Create your first contest to get started.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Contest
            </Button>
          </CardContent>
        </Card>
      )}
      
      {selectedContest && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedContest.title}</CardTitle>
            <CardDescription>
              Entries: {entries.length} | Status: {selectedContest.status} | 
              End: {new Date(selectedContest.end_date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading entries...</span>
              </div>
            ) : entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {entry.user_name || 'Anonymous'}
                      </TableCell>
                      <TableCell>{entry.description || 'No description'}</TableCell>
                      <TableCell>{entry.vote_count}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.approved 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.approved ? 'Approved' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {!entry.approved ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleApproveEntry(entry.id)}
                                className="text-green-500"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRevokeEntry(entry.id)}
                                className="text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsChooseWinnerOpen(true);
                              }}
                            >
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No entries found for this contest.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Create Contest Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Contest</DialogTitle>
            <DialogDescription>Set up a new music contest for your platform</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contest Title</Label>
                <Input 
                  value={newContest.title}
                  onChange={(e) => setNewContest({...newContest, title: e.target.value})}
                  placeholder="e.g., Summer Hits 2025"
                />
              </div>
              <div>
                <Label>Prize</Label>
                <Input 
                  value={newContest.prize}
                  onChange={(e) => setNewContest({...newContest, prize: e.target.value})}
                  placeholder="e.g., ₦100,000 + Record Deal"
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={newContest.description}
                onChange={(e) => setNewContest({...newContest, description: e.target.value})}
                placeholder="Contest description..."
              />
            </div>
            
            <div>
              <Label>Rules (comma-separated)</Label>
              <Textarea 
                value={newContest.rules}
                onChange={(e) => setNewContest({...newContest, rules: e.target.value})}
                placeholder="Use official beat, Upload video, Song must be 1+ minutes, etc."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="datetime-local"
                  value={newContest.start_date}
                  onChange={(e) => setNewContest({...newContest, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="datetime-local"
                  value={newContest.end_date}
                  onChange={(e) => setNewContest({...newContest, end_date: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label>Instrumental URL</Label>
              <Input 
                value={newContest.instrumental_url}
                onChange={(e) => setNewContest({...newContest, instrumental_url: e.target.value})}
                placeholder="https://example.com/beat.mp3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContest}>
              Create Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* End Contest Alert Dialog */}
      <AlertDialog open={isEndContestOpen} onOpenChange={setIsEndContestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Current Contest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the contest to new entries and voting. 
              Are you sure you want to end "{selectedContest?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndContest}>
              End Contest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Choose Winner Alert Dialog */}
      <AlertDialog open={isChooseWinnerOpen} onOpenChange={setIsChooseWinnerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose Winner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to select "{selectedEntry?.description}" by {selectedEntry?.user_name} as the winner?
              This action will finalize the contest results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChooseWinner}>
              Confirm Winner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
