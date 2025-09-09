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
import { Eye, Check, X, Trophy, Plus, Loader2, AlertCircle, RefreshCw, Edit, Calendar as CalendarIcon, Users, Trash2, Upload, Play } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WinnerClaimManagement } from './WinnerClaimManagement';

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
  entry_fee?: number;
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
  const [topEntries, setTopEntries] = useState<ContestEntry[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [activeTab, setActiveTab] = useState('contests');
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [instrumentalFile, setInstrumentalFile] = useState<File | null>(null);
  const [uploadingInstrumental, setUploadingInstrumental] = useState(false);
  const [mediaPlaybackEntry, setMediaPlaybackEntry] = useState<ContestEntry | null>(null);
  const [isMediaPlaybackDialogOpen, setIsMediaPlaybackDialogOpen] = useState(false);

  // Form states for creating/editing contest
  const [contestForm, setContestForm] = useState({
    title: '',
    description: '',
    prize: '',
    rules: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    instrumental_url: '',
    entry_fee: 0,
  });

  // Reset form
  const resetForm = () => {
    setContestForm({
      title: '',
      description: '',
      prize: '',
      rules: '',
      start_date: null,
      end_date: null,
      instrumental_url: '',
      entry_fee: 0,
    });
    setInstrumentalFile(null);
  };

  // Upload instrumental file to Supabase Storage
  const uploadInstrumental = async (file: File): Promise<string | null> => {
    try {
      setUploadingInstrumental(true);
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('instrumentals')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('instrumentals')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading instrumental:', error);
      toast.error('Failed to upload instrumental: ' + error.message);
      return null;
    } finally {
      setUploadingInstrumental(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      
      setInstrumentalFile(file);
      toast.success('Audio file selected: ' + file.name);
    }
  };

  // Helper function to format datetime for display
  const formatDateTimeForDisplay = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'PPP p');
  };

  // Helper function to convert Date to ISO string
  const formatDateForSubmission = (date: Date | null) => {
    if (!date) return null;
    return date.toISOString();
  };

  // Fetch entries with EXPLICIT separation of contest_entries and profiles
  const fetchEntries = async (contestId: string, topOnly: boolean = false) => {
    console.log('🚀 DEBUG: Starting fetchEntries() for contest:', contestId, 'topOnly:', topOnly);
    
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
        .order('vote_count', { ascending: false })
        .limit(topOnly ? 3 : 1000);

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
    const topOnly = contest.status === 'completed';
    fetchEntries(contest.id, topOnly);
  };

  // Edit contest
  const handleEditContest = (contest: Contest) => {
    setSelectedContest(contest);
    setContestForm({
      title: contest.title,
      description: contest.description,
      prize: contest.prize,
      rules: contest.rules || '',
      start_date: new Date(contest.start_date),
      end_date: new Date(contest.end_date),
      instrumental_url: contest.instrumental_url || '',
      entry_fee: contest.entry_fee || 0,
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
      toast.error('Please select both start and end dates');
      return;
    }

    try {
      // Check if end date is after start date
      if (contestForm.end_date <= contestForm.start_date) {
        toast.error('End date must be after start date');
        return;
      }

      let instrumentalUrl = contestForm.instrumental_url;

      // Upload instrumental file if provided
      if (instrumentalFile) {
        const uploadedUrl = await uploadInstrumental(instrumentalFile);
        if (!uploadedUrl) {
          toast.error('Failed to upload instrumental file');
          return;
        }
        instrumentalUrl = uploadedUrl;
      }

      const contestData = {
        title: contestForm.title,
        description: contestForm.description,
        prize: contestForm.prize,
        rules: contestForm.rules,
        start_date: formatDateForSubmission(contestForm.start_date)!,
        end_date: formatDateForSubmission(contestForm.end_date)!,
        instrumental_url: instrumentalUrl,
        entry_fee: contestForm.entry_fee || 0,
      };

      const success = await createContest(contestData);
      if (success) {
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create contest');
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
      toast.error('Please select both start and end dates');
      return;
    }

    try {
      // Check if end date is after start date
      if (contestForm.end_date <= contestForm.start_date) {
        toast.error('End date must be after start date');
        return;
      }

      let instrumentalUrl = contestForm.instrumental_url;

      // Upload new instrumental file if provided
      if (instrumentalFile) {
        const uploadedUrl = await uploadInstrumental(instrumentalFile);
        if (!uploadedUrl) {
          toast.error('Failed to upload instrumental file');
          return;
        }
        instrumentalUrl = uploadedUrl;
      }

      const contestData = {
        title: contestForm.title,
        description: contestForm.description,
        prize: contestForm.prize,
        rules: contestForm.rules,
        start_date: formatDateForSubmission(contestForm.start_date)!,
        end_date: formatDateForSubmission(contestForm.end_date)!,
        instrumental_url: instrumentalUrl,
        entry_fee: contestForm.entry_fee || 0,
      };

      const success = await updateContest(selectedContest.id, contestData);
      if (success) {
        setIsEditDialogOpen(false);
        setSelectedContest(null);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update contest');
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

  // Choose winner
  const confirmChooseWinner = async () => {
    if (!selectedEntry || !selectedContest) return;

    try {
      const { error } = await supabase.rpc('select_contest_winner', {
        p_contest_id: selectedContest.id,
        p_user_id: selectedEntry.user_id,
        p_rank: 1, // Assuming 1st place for now
      });

      if (error) throw error;

      toast.success(`${selectedEntry.user_name || 'User'} has been selected as the winner!`);
      setIsChooseWinnerOpen(false);
      // Optionally, refresh data
      refreshContests();
      fetchEntries(selectedContest.id);
    } catch (error: any) {
      console.error('Error selecting winner:', error);
      toast.error('Failed to select winner: ' + error.message);
    }
  };

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
                            <CalendarIcon className="h-4 w-4" />
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

      {activeTab === 'claims' && <WinnerClaimManagement />}
      
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('Play button clicked for entry:', entry);
                                  setMediaPlaybackEntry(entry);
                                  setIsMediaPlaybackDialogOpen(true);
                                }}
                                disabled={!entry.video_url || !entry.media_type.startsWith('audio/')}
                              >
                                <Play className="h-4 w-4" />
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Media Playback Dialog */}
      <Dialog open={isMediaPlaybackDialogOpen} onOpenChange={setIsMediaPlaybackDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Playback: {mediaPlaybackEntry?.description || 'Entry'}</DialogTitle>
            <DialogDescription>
              Playing submission from {mediaPlaybackEntry?.user_name || 'Anonymous'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {mediaPlaybackEntry?.video_url && mediaPlaybackEntry.media_type.startsWith('audio/') && (
              <audio controls autoPlay className="w-full">
                <source src={mediaPlaybackEntry.video_url} type={mediaPlaybackEntry.media_type} />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMediaPlaybackDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
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
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contestForm.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contestForm.start_date ? (
                        formatDateTimeForDisplay(contestForm.start_date)
                      ) : (
                        <span>Pick start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={contestForm.start_date || undefined}
                      onSelect={(date) => setContestForm({...contestForm, start_date: date || null})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contestForm.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contestForm.end_date ? (
                        formatDateTimeForDisplay(contestForm.end_date)
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={contestForm.end_date || undefined}
                      onSelect={(date) => setContestForm({...contestForm, end_date: date || null})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label>Instrumental Audio</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  {instrumentalFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInstrumentalFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {instrumentalFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>{instrumentalFile.name}</span>
                    <span>({(instrumentalFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload an audio file (max 50MB) or leave empty if not needed
                </p>
              </div>
            </div>
            
            <div>
              <Label>Entry Fee (Credits)</Label>
              <Input
                type="number"
                value={contestForm.entry_fee}
                onChange={(e) => setContestForm({ ...contestForm, entry_fee: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The number of credits required to enter. Set to 0 for free entry.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateContest} disabled={uploadingInstrumental}>
              {uploadingInstrumental ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Create Contest'
              )}
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
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contestForm.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contestForm.start_date ? (
                        formatDateTimeForDisplay(contestForm.start_date)
                      ) : (
                        <span>Pick start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={contestForm.start_date || undefined}
                      onSelect={(date) => setContestForm({...contestForm, start_date: date || null})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contestForm.end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contestForm.end_date ? (
                        formatDateTimeForDisplay(contestForm.end_date)
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={contestForm.end_date || undefined}
                      onSelect={(date) => setContestForm({...contestForm, end_date: date || null})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div>
              <Label>Instrumental Audio</Label>
              <div className="space-y-2">
                {selectedContest?.instrumental_url && (
                  <div className="p-2 bg-muted rounded text-sm">
                    Current: <a href={selectedContest.instrumental_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View current instrumental</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  {instrumentalFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInstrumentalFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {instrumentalFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    <span>{instrumentalFile.name}</span>
                    <span>({(instrumentalFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a new audio file to replace the current one (max 50MB)
                </p>
              </div>
            </div>
            
            <div>
              <Label>Entry Fee (Credits)</Label>
              <Input
                type="number"
                value={contestForm.entry_fee}
                onChange={(e) => setContestForm({ ...contestForm, entry_fee: Number(e.target.value) })}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The number of credits required to enter. Set to 0 for free entry.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContest} disabled={uploadingInstrumental}>
              {uploadingInstrumental ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Update Contest'
              )}
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
