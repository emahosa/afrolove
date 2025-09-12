import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WinnerClaimDetail {
  id: string;
  contest_id: string;
  user_id: string;
  winner_rank: number;
  full_name: string;
  address: string;
  phone_number: string;
  social_media_link: string | null;
  bank_account_details: string;
  status: 'Pending' | 'Processing' | 'Fulfilled';
  admin_notes: string | null;
  submitted_at: string;
  created_at: string;
}

export const WinnerClaimManagement = () => {
  const [claims, setClaims] = useState<WinnerClaimDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<WinnerClaimDetail | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('winner_claim_details')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch winner claims');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaim = (claim: WinnerClaimDetail) => {
    setSelectedClaim(claim);
    setAdminNotes(claim.admin_notes || '');
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = async (claimId: string, newStatus: 'Processing' | 'Fulfilled') => {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('winner_claim_details')
        .update({ status: newStatus, admin_notes: adminNotes })
        .eq('id', claimId);

      if (error) throw error;

      toast.success(`Claim status updated to ${newStatus}`);
      fetchClaims();
      setViewDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating claim status:', error);
      toast.error('Failed to update claim status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusVariant = (status: 'Pending' | 'Processing' | 'Fulfilled') => {
    switch (status) {
      case 'Fulfilled':
        return 'default';
      case 'Processing':
        return 'secondary';
      case 'Pending':
      default:
        return 'destructive';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Winner Claim Management</CardTitle>
          <CardDescription>
            Manage prize claim requests from contest winners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No winner claims submitted yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Winner Name</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">#{claim.winner_rank}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(claim.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(claim.status)} className="capitalize">
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClaim(claim)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedClaim && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Winner Claim Details</DialogTitle>
              <DialogDescription>
                Review and manage winner claim request
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Details sections remain the same */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Full Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedClaim.full_name}</p>
                </div>
                <div>
                  <Label className="font-medium">Winner Rank</Label>
                  <p className="text-sm text-muted-foreground">#{selectedClaim.winner_rank}</p>
                </div>
              </div>
              
              <div>
                <Label className="font-medium">Address</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedClaim.address}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Phone Number</Label>
                  <p className="text-sm text-muted-foreground">{selectedClaim.phone_number}</p>
                </div>
                <div>
                  <Label className="font-medium">Social Media</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedClaim.social_media_link || 'Not provided'}
                  </p>
                </div>
              </div>
              
              <div>
                <Label className="font-medium">Bank Account Details</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedClaim.bank_account_details}</p>
              </div>
              
              <div>
                <Label htmlFor="adminNotes" className="font-medium">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this claim..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={updating}>
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Status"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus(selectedClaim.id, 'Processing')}
                      disabled={selectedClaim.status === 'Processing'}
                    >
                      Mark as Processing
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus(selectedClaim.id, 'Fulfilled')}
                      disabled={selectedClaim.status === 'Fulfilled'}
                    >
                      Mark as Fulfilled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};