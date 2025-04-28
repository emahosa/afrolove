
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

interface ContestEntry {
  id: number;
  user: string;
  title: string;
  votes: number;
  status: string;
}

interface ContestManagementProps {
  contestEntries: ContestEntry[];
  renderStatusLabel: (status: string) => React.ReactNode;
}

export const ContestManagement = ({ contestEntries, renderStatusLabel }: ContestManagementProps) => {
  const [entries, setEntries] = useState<ContestEntry[]>(contestEntries);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEndContestDialogOpen, setIsEndContestDialogOpen] = useState(false);
  const [isWinnerDialogOpen, setIsWinnerDialogOpen] = useState(false);
  const [contestActive, setContestActive] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState<ContestEntry | null>(null);

  const handleCreateNewContest = () => {
    setIsCreateDialogOpen(true);
  };

  const confirmCreateContest = () => {
    toast.success("New contest created");
    setIsCreateDialogOpen(false);
    setContestActive(true);
  };

  const handleEndContest = () => {
    setIsEndContestDialogOpen(true);
  };

  const confirmEndContest = () => {
    toast.success("Contest ended successfully");
    setIsEndContestDialogOpen(false);
    setContestActive(false);
  };

  const handleChooseWinner = () => {
    if (entries.length === 0) {
      toast.error("No entries to select winner from");
      return;
    }
    setIsWinnerDialogOpen(true);
  };

  const selectWinner = (entry: ContestEntry) => {
    setSelectedWinner(entry);
  };

  const confirmWinner = () => {
    if (selectedWinner) {
      toast.success(`${selectedWinner.user}'s entry "${selectedWinner.title}" declared as winner!`);
      setIsWinnerDialogOpen(false);
    } else {
      toast.error("Please select a winner first");
    }
  };

  const handleApproveEntry = (entryId: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? { ...entry, status: 'approved' } 
        : entry
    ));
    toast.success("Entry approved");
  };

  const handleRevokeEntry = (entryId: number) => {
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? { ...entry, status: 'pending' } 
        : entry
    ));
    toast.success("Entry revoked");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contest Management</h2>
        <Button onClick={handleCreateNewContest}>Create New Contest</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current Contest: Summer Hits 2025</CardTitle>
          <CardDescription>Active until June 30, 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Contest Entries</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Votes</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="py-3 px-4">{entry.user}</td>
                      <td className="py-3 px-4">{entry.title}</td>
                      <td className="py-3 px-4">{entry.votes}</td>
                      <td className="py-3 px-4">{renderStatusLabel(entry.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          View
                        </Button>
                        {entry.status === 'pending' ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-green-500"
                            onClick={() => handleApproveEntry(entry.id)}
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-amber-500"
                            onClick={() => handleRevokeEntry(entry.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleEndContest} disabled={!contestActive}>
              End Contest
            </Button>
            <Button onClick={handleChooseWinner} disabled={!contestActive}>
              Choose Winner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create New Contest Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Contest</DialogTitle>
            <DialogDescription>
              Set up a new contest for your users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contest Title</label>
              <input 
                type="text" 
                placeholder="Summer Hits 2025" 
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prize Details</label>
              <input 
                type="text" 
                placeholder="$500 and featured on homepage" 
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCreateContest}>Create Contest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Contest Dialog */}
      <Dialog open={isEndContestDialogOpen} onOpenChange={setIsEndContestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>End Contest</DialogTitle>
            <DialogDescription>
              Are you sure you want to end the current contest? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEndContestDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEndContest}>
              End Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Choose Winner Dialog */}
      <Dialog open={isWinnerDialogOpen} onOpenChange={setIsWinnerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose Contest Winner</DialogTitle>
            <DialogDescription>
              Select the winner for the current contest.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto py-4">
            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className={`p-3 border border-gray-200 rounded-md mb-2 cursor-pointer ${selectedWinner?.id === entry.id ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => selectWinner(entry)}
              >
                <div className="font-medium">{entry.title}</div>
                <div className="text-sm text-muted-foreground">By {entry.user} • {entry.votes} votes</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWinnerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmWinner} disabled={!selectedWinner}>
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
