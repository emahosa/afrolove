import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
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
  prize_claimed: boolean;
  admin_reviewed: boolean;
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

  const handleUpdateClaim = async (claimId: string, reviewed: boolean, prizeClaimed: boolean) => {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('winner_claim_details')
        .update({
          admin_reviewed: reviewed,
          prize_claimed: prizeClaimed,
          admin_notes: adminNotes
        })
        .eq('id', claimId);

      if (error) throw error;

      toast.success('Claim updated successfully');
      fetchClaims();
      setViewDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    } finally {
      setUpdating(false);
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
                      <div className="flex flex-col gap-1">
                        <Badge variant={claim.admin_reviewed ? "default" : "secondary"}>
                          {claim.admin_reviewed ? "Reviewed" : "Pending Review"}
                        </Badge>
                        {claim.admin_reviewed && (
                          <Badge variant={claim.prize_claimed ? "default" : "destructive"}>
                            {claim.prize_claimed ? "Prize Claimed" : "Prize Pending"}
                          </Badge>
                        )}
                      </div>
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
                <Button
                  variant="outline"
                  onClick={() => handleUpdateClaim(selectedClaim.id, true, false)}
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Reviewed
                </Button>
                <Button
                  onClick={() => handleUpdateClaim(selectedClaim.id, true, true)}
                  disabled={updating}
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark Prize Claimed
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};