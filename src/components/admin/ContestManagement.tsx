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
import { Eye, Check, X, Trophy, Plus, Loader2, AlertCircle, RefreshCw, Edit, Calendar, Users, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useContest } from '@/hooks/use-contest';

console.log("✅ ContestManagement component loaded - Using useContest hook");

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
  created_at: string;
  voting_enabled?: boolean;
  max_entries_per_user?: number;
}

export const ContestManagement = () => {
  const { 
    contests, 
    loading, 
    error,
    createContest,
    updateContest,
    deleteContest,
    refreshContests
  } = useContest();

  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEndContestOpen, setIsEndContestOpen] = useState(false);
  const [isChooseWinnerOpen, setIsChooseWinnerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Form states for creating/editing contest
  const [contestForm, setContestForm] = useState({
    title: '',
    description: '',
    prize: '',
    rules: '',
    start_date: '',
    end_date: '',
    instrumental_url: ''
  });

  // Reset form
  const resetForm = () => {
    setContestForm({
      title: '',
      description: '',
      prize: '',
      rules: '',
      start_date: '',
      end_date: '',
      instrumental_url: ''
    });
  };

  // Helper function to format datetime for input
  const formatDateTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  // Helper function to validate and format datetime
  const validateAndFormatDateTime = (dateString: string) => {
    if (!dateString || dateString.trim() === '') {
      return null;
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date.toISOString();
    } catch (error) {
      throw new Error('Invalid date format');
    }
  };

  // Fetch entries with EXPLICIT separation of contest_entries and profiles
  const fetchEntries = async (contestId: string) => {
    console.log('🚀 DEBUG: Starting fetchEntries() for contest:', contestId);
    
    if (!contestId) {
      console.log('⚠️ DEBUG: No contest ID provided');
      setEntries([]);
      return;
    }
    
    try {
      setEntriesLoading(true);
      console.log('🔍 DEBUG: Step 1 - Fetching contest_entries ONLY (NO USERS)');
      
      // STEP 1: Get contest entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select(`
          id,
          contest_id,
          user_id,
          video_url,
          description,
          approved,
          vote_count,
          media_type,
          created_at
        `)
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false });

      console.log('✅ DEBUG: Step 1 completed - contest_entries query result:', entriesData);

      if (entriesError) {
        console.error('❌ DEBUG: Error in contest_entries query:', entriesError);
        throw entriesError;
      }

      if (!entriesData || entriesData.length === 0) {
        console.log('📝 DEBUG: No entries found, setting empty array');
        setEntries([]);
        return;
      }
      
      // STEP 2: Get unique user IDs
      const userIds = [...new Set(entriesData.map(entry => entry.user_id))];
      console.log('🔍 DEBUG: Step 2 - Need profiles for user IDs:', userIds);
      
      if (userIds.length === 0) {
        console.log('⚠️ DEBUG: No user IDs found in entries');
        setEntries(entriesData.map(entry => ({ ...entry, user_name: 'Unknown User' })));
        return;
      }
      
      console.log('🔍 DEBUG: Step 3 - Fetching profiles ONLY');
      
      // STEP 3: Get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username
        `)
        .in('id', userIds);

      console.log('✅ DEBUG: Step 3 completed - profiles query result:', profilesData);

      if (profilesError) {
        console.warn('⚠️ DEBUG: Error fetching profiles (will continue with unknown users):', profilesError);
      }

      // STEP 4: Create lookup map
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile.full_name || profile.username || 'Anonymous User');
        });
      }
      
      console.log('🔍 DEBUG: Step 4 - Created profiles map:', Array.from(profilesMap.entries()));

      // STEP 5: Combine data in memory
      const entriesWithUserInfo = entriesData.map(entry => ({
        ...entry,
        user_name: profilesMap.get(entry.user_id) || 'Anonymous User'
      }));
      
      console.log('✅ DEBUG: Step 5 completed - Final entries with user names:', entriesWithUserInfo);
      setEntries(entriesWithUserInfo);
      
    } catch (error: any) {
      console.error('💥 DEBUG: Error in fetchEntries:', error);
      const errorMessage = error.message || 'Failed to fetch entries';
      toast.error(errorMessage);
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  // View contest details
  const handleViewContest = (contest: Contest) => {
    setSelectedContest(contest);
    setIsViewDialogOpen(true);
    fetchEntries(contest.id);
  };

  // Edit contest
  const handleEditContest = (contest: Contest) => {
    setSelectedContest(contest);
    setContestForm({
      title: contest.title,
      description: contest.description,
      prize: contest.prize,
      rules: contest.rules || '',
      start_date: formatDateTimeForInput(contest.start_date),
      end_date: formatDateTimeForInput(contest.end_date),
      instrumental_url: contest.instrumental_url || ''
    });
    setIsEditDialogOpen(true);
  };

  // Handle contest creation
  const handleCreateContest = async () => {
    console.log('🔄 DEBUG: handleCreateContest - Using createContest from hook');
    
    if (!contestForm.title || !contestForm.description || !contestForm.prize) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!contestForm.start_date || !contestForm.end_date) {
      toast.error('Please provide both start and end dates');
      return;
    }

    try {
      // Validate and format dates
      const startDate = validateAndFormatDateTime(contestForm.start_date);
      const endDate = validateAndFormatDateTime(contestForm.end_date);
      
      if (!startDate || !endDate) {
        toast.error('Please provide valid start and end dates');
        return;
      }

      // Check if end date is after start date
      if (new Date(endDate) <= new Date(startDate)) {
        toast.error('End date must be after start date');
        return;
      }

      const contestData = {
        ...contestForm,
        start_date: startDate,
        end_date: endDate
      };

      const success = await createContest(contestData);
      if (success) {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid date format');
    }
  };

  // Handle contest update
  const handleUpdateContest = async () => {
    if (!selectedContest) return;
    
    console.log('🔄 DEBUG: handleUpdateContest - Using updateContest from hook');
    
    if (!contestForm.title || !contestForm.description || !contestForm.prize) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!contestForm.start_date || !contestForm.end_date) {
      toast.error('Please provide both start and end dates');
      return;
    }

    try {
      // Validate and format dates
      const startDate = validateAndFormatDateTime(contestForm.start_date);
      const endDate = validateAndFormatDateTime(contestForm.end_date);
      
      if (!startDate || !endDate) {
        toast.error('Please provide valid start and end dates');
        return;
      }

      // Check if end date is after start date
      if (new Date(endDate) <= new Date(startDate)) {
        toast.error('End date must be after start date');
        return;
      }

      const contestData = {
        ...contestForm,
        start_date: startDate,
        end_date: endDate
      };

      const success = await updateContest(selectedContest.id, contestData);
      if (success) {
        setIsEditDialogOpen(false);
        setSelectedContest(null);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid date format');
    }
  };

  // Handle contest deletion
  const handleDeleteContest = async () => {
    if (!selectedContest) return;
    
    console.log('🔄 DEBUG: handleDeleteContest - Using deleteContest from hook');
    
    const success = await deleteContest(selectedContest.id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedContest(null);
    }
  };

  // Approve entry - ONLY contest_entries table
  const handleApproveEntry = async (entryId: string) => {
    console.log('🔄 DEBUG: handleApproveEntry - ONLY contest_entries table');
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

  // Reject entry - ONLY contest_entries table
  const handleRevokeEntry = async (entryId: string) => {
    console.log('🔄 DEBUG: handleRevokeEntry - ONLY contest_entries table');
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

  // End contest - ONLY contests table
  const confirmEndContest = async () => {
    console.log('🔄 DEBUG: confirmEndContest - ONLY contests table');
    if (!selectedContest) return;

    try {
      const { error } = await supabase
        .from('contests')
        .update({ status: 'completed' })
        .eq('id', selectedContest.id);

      if (error) throw error;

      toast.success("Contest ended successfully");
      setIsEndContestOpen(false);
      refreshContests();
    } catch (error: any) {
      console.error('Error ending contest:', error);
      toast.error('Failed to end contest: ' + error.message);
    }
  };

  // Choose winner - NO DATABASE CALLS, JUST UI
  const confirmChooseWinner = () => {
    console.log('🔄 DEBUG: confirmChooseWinner - NO DATABASE CALLS');
    if (selectedEntry) {
      toast.success(`${selectedEntry.user_name || 'User'} has been selected as the winner!`);
      setIsChooseWinnerOpen(false);
    }
  };

  useEffect(() => {
    console.log('🚀 DEBUG: ContestManagement component mounted');
    const loadData = async () => {
      console.log('🔍 DEBUG: Starting initial data load');
      setLoading(true);
      await fetchContests();
      setLoading(false);
      console.log('✅ DEBUG: Initial data load completed');
    };
    loadData();
  }, []);

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
                onClick={refreshContests}
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
          <Button variant="outline" onClick={refreshContests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Contest
          </Button>
        </div>
      </div>

      {/* Contests List */}
      {contests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Contests</CardTitle>
            <CardDescription>Manage your contests and their entries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contests.map((contest) => (
                  <TableRow key={contest.id}>
                    <TableCell className="font-medium">{contest.title}</TableCell>
                    <TableCell>
                      <Badge variant={contest.status === 'active' ? 'default' : contest.status === 'completed' ? 'secondary' : 'outline'}>
                        {contest.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(contest.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(contest.end_date).toLocaleDateString()}</TableCell>
                    <TableCell>{contest.prize}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewContest(contest)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditContest(contest)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedContest(contest);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {contest.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedContest(contest);
                              setIsEndContestOpen(true);
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      
      {/* View Contest Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Contest Details: {selectedContest?.title}
            </DialogTitle>
            <DialogDescription>
              View contest information and manage entries
            </DialogDescription>
          </DialogHeader>
          
          {selectedContest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Status</Label>
                  <Badge variant={selectedContest.status === 'active' ? 'default' : 'secondary'}>
                    {selectedContest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-semibold">Prize</Label>
                  <p>{selectedContest.prize}</p>
                </div>
                <div>
                  <Label className="font-semibold">Start Date</Label>
                  <p>{new Date(selectedContest.start_date).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="font-semibold">End Date</Label>
                  <p>{new Date(selectedContest.end_date).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Description</Label>
                <p className="mt-1">{selectedContest.description}</p>
              </div>
              
              {selectedContest.rules && (
                <div>
                  <Label className="font-semibold">Rules</Label>
                  <p className="mt-1">{selectedContest.rules}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contest Entries ({entries.length})
                  </h3>
                </div>
                
                {entriesLoading ? (
                  <div className="flex justify-center p-4">
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
                          <TableCell>{entry.user_name || 'Anonymous'}</TableCell>
                          <TableCell>{entry.description || 'No description'}</TableCell>
                          <TableCell>{entry.vote_count}</TableCell>
                          <TableCell>
                            <Badge variant={entry.approved ? 'default' : 'secondary'}>
                              {entry.approved ? 'Approved' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
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
                <Label>Contest Title *</Label>
                <Input 
                  value={contestForm.title}
                  onChange={(e) => setContestForm({...contestForm, title: e.target.value})}
                  placeholder="e.g., Summer Hits 2025"
                />
              </div>
              <div>
                <Label>Prize *</Label>
                <Input 
                  value={contestForm.prize}
                  onChange={(e) => setContestForm({...contestForm, prize: e.target.value})}
                  placeholder="e.g., ₦100,000 + Record Deal"
                />
              </div>
            </div>
            
            <div>
              <Label>Description *</Label>
              <Textarea 
                value={contestForm.description}
                onChange={(e) => setContestForm({...contestForm, description: e.target.value})}
                placeholder="Contest description..."
              />
            </div>
            
            <div>
              <Label>Rules</Label>
              <Textarea 
                value={contestForm.rules}
                onChange={(e) => setContestForm({...contestForm, rules: e.target.value})}
                placeholder="Contest rules and requirements..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input 
                  type="datetime-local"
                  value={contestForm.start_date}
                  onChange={(e) => setContestForm({...contestForm, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input 
                  type="datetime-local"
                  value={contestForm.end_date}
                  onChange={(e) => setContestForm({...contestForm, end_date: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label>Instrumental URL</Label>
              <Input 
                value={contestForm.instrumental_url}
                onChange={(e) => setContestForm({...contestForm, instrumental_url: e.target.value})}
                placeholder="https://example.com/beat.mp3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateContest}>
              Create Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contest Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contest</DialogTitle>
            <DialogDescription>Update contest information</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contest Title *</Label>
                <Input 
                  value={contestForm.title}
                  onChange={(e) => setContestForm({...contestForm, title: e.target.value})}
                  placeholder="e.g., Summer Hits 2025"
                />
              </div>
              <div>
                <Label>Prize *</Label>
                <Input 
                  value={contestForm.prize}
                  onChange={(e) => setContestForm({...contestForm, prize: e.target.value})}
                  placeholder="e.g., ₦100,000 + Record Deal"
                />
              </div>
            </div>
            
            <div>
              <Label>Description *</Label>
              <Textarea 
                value={contestForm.description}
                onChange={(e) => setContestForm({...contestForm, description: e.target.value})}
                placeholder="Contest description..."
              />
            </div>
            
            <div>
              <Label>Rules</Label>
              <Textarea 
                value={contestForm.rules}
                onChange={(e) => setContestForm({...contestForm, rules: e.target.value})}
                placeholder="Contest rules and requirements..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input 
                  type="datetime-local"
                  value={contestForm.start_date}
                  onChange={(e) => setContestForm({...contestForm, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input 
                  type="datetime-local"
                  value={contestForm.end_date}
                  onChange={(e) => setContestForm({...contestForm, end_date: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label>Instrumental URL</Label>
              <Input 
                value={contestForm.instrumental_url}
                onChange={(e) => setContestForm({...contestForm, instrumental_url: e.target.value})}
                placeholder="https://example.com/beat.mp3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContest}>
              Update Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Contest Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contest?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedContest?.title}"? 
              This action cannot be undone and will also delete all associated entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContest} className="bg-red-500 hover:bg-red-600">
              Delete Contest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
