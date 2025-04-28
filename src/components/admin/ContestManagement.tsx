
import { useState } from 'react';
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
import { Eye, Check, X, Trophy } from 'lucide-react';
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

interface ContestEntry {
  id: number;
  user: string;
  title: string;
  votes: number;
  status: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  joinDate: string;
  songsCreated: number;
  status: string;
}

interface ContestManagementProps {
  contestEntries: ContestEntry[];
  renderStatusLabel: (status: string) => React.ReactNode;
}

export const ContestManagement = ({ contestEntries, renderStatusLabel }: ContestManagementProps) => {
  const [entries, setEntries] = useState<ContestEntry[]>(contestEntries);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEndContestOpen, setIsEndContestOpen] = useState(false);
  const [isChooseWinnerOpen, setIsChooseWinnerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ContestEntry | null>(null);

  const mockUserProfiles: Record<string, UserProfile> = {
    "John Doe": {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      joinDate: "2025-01-15",
      songsCreated: 12,
      status: "active"
    },
    "Jane Smith": {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      joinDate: "2025-02-20",
      songsCreated: 8,
      status: "active"
    },
    "Robert Johnson": {
      id: 3,
      name: "Robert Johnson",
      email: "robert@example.com",
      joinDate: "2025-03-10",
      songsCreated: 5,
      status: "active"
    }
  };

  const handleViewUser = (userName: string) => {
    const userProfile = mockUserProfiles[userName];
    if (userProfile) {
      setSelectedUser(userProfile);
      setIsUserDialogOpen(true);
    }
  };

  const handleApproveEntry = (entryId: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? {...entry, status: "approved"} 
        : entry
    ));
    toast.success("Entry approved successfully");
  };

  const handleRevokeEntry = (entryId: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? {...entry, status: "rejected"} 
        : entry
    ));
    toast.success("Entry rejected successfully");
  };

  const handleCreateContest = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEndContest = () => {
    setIsEndContestOpen(true);
  };

  const handleChooseWinner = (entry: ContestEntry) => {
    setSelectedEntry(entry);
    setIsChooseWinnerOpen(true);
  };

  const confirmEndContest = () => {
    toast.success("Contest ended successfully");
    setIsEndContestOpen(false);
  };

  const confirmChooseWinner = () => {
    if (selectedEntry) {
      toast.success(`${selectedEntry.user} has been selected as the winner!`);
      setIsChooseWinnerOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contest Management</h2>
        <div className="space-x-2">
          <Button onClick={handleCreateContest}>Create New Contest</Button>
          <Button variant="outline" onClick={handleEndContest}>End Current Contest</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Contest: Summer Hits 2025</CardTitle>
          <CardDescription>Entries: {entries.length} | Start: Apr 10, 2025 | End: May 10, 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Song Title</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.user}</TableCell>
                  <TableCell>{entry.title}</TableCell>
                  <TableCell>{entry.votes}</TableCell>
                  <TableCell>{renderStatusLabel(entry.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewUser(entry.user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {entry.status === "pending" && (
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
                      )}
                      
                      {entry.status === "approved" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleChooseWinner(entry)}
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
        </CardContent>
      </Card>
      
      {/* Create Contest Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contest</DialogTitle>
            <DialogDescription>Set up a new music contest for your platform</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Contest Title</label>
              <input 
                type="text" 
                placeholder="e.g., Summer Hits 2025"
                className="w-full border rounded-md p-2 mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea 
                placeholder="Contest description..."
                className="w-full border rounded-md p-2 mt-1 h-24"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-md p-2 mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input 
                  type="date" 
                  className="w-full border rounded-md p-2 mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Prize</label>
              <input 
                type="text" 
                placeholder="e.g., 50 credits + Premium feature access"
                className="w-full border rounded-md p-2 mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success("New contest created successfully");
              setIsCreateDialogOpen(false);
            }}>
              Create Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{selectedUser?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Join Date</p>
                <p>{selectedUser?.joinDate}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Songs Created</p>
                <p>{selectedUser?.songsCreated}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="capitalize">{selectedUser?.status}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Recent Activity</p>
              <ul className="mt-2 space-y-2">
                <li className="text-sm">Created song "Midnight Dreams" - 3 days ago</li>
                <li className="text-sm">Updated profile - 5 days ago</li>
                <li className="text-sm">Entered contest "Summer Hits 2025" - 1 week ago</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsUserDialogOpen(false)}>
              Close
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
              This will close the contest to new entries and finalize the voting process.
              Are you sure you want to end the "Summer Hits 2025" contest?
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
              Are you sure you want to select "{selectedEntry?.title}" by {selectedEntry?.user} as the winner?
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
