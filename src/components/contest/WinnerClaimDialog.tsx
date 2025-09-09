// TODO: The admin-side management for these prize claims is handled in WinnerClaimManagement.tsx.
// This component correctly submits the data, but the full end-to-end flow might require further review.
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface WinnerClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contestId: string;
  winnerRank: number;
}

export const WinnerClaimDialog = ({ open, onOpenChange, contestId, winnerRank }: WinnerClaimDialogProps) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    phoneNumber: '',
    socialMediaLink: '',
    bankAccountDetails: ''
  });

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.fullName || !formData.address || !formData.phoneNumber || !formData.bankAccountDetails) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('winner_claim_details')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          winner_rank: winnerRank,
          full_name: formData.fullName,
          address: formData.address,
          phone_number: formData.phoneNumber,
          social_media_link: formData.socialMediaLink,
          bank_account_details: formData.bankAccountDetails
        });

      if (error) throw error;

      toast.success('Your claim details have been submitted successfully!');
      onOpenChange(false);
      setFormData({
        fullName: '',
        address: '',
        phoneNumber: '',
        socialMediaLink: '',
        bankAccountDetails: ''
      });
    } catch (error: any) {
      console.error('Error submitting claim details:', error);
      toast.error('Failed to submit claim details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Claim Your Prize</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Congratulations on winning! Please provide your details to claim your prize.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Enter your full name"
              className="bg-input border-border text-foreground"
            />
          </div>
          
          <div>
            <Label htmlFor="address" className="text-foreground">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter your full address"
              className="bg-input border-border text-foreground min-h-[80px]"
            />
          </div>
          
          <div>
            <Label htmlFor="phoneNumber" className="text-foreground">Phone Number *</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Enter your phone number"
              className="bg-input border-border text-foreground"
            />
          </div>
          
          <div>
            <Label htmlFor="socialMediaLink" className="text-foreground">Social Media Link</Label>
            <Input
              id="socialMediaLink"
              value={formData.socialMediaLink}
              onChange={(e) => setFormData(prev => ({ ...prev, socialMediaLink: e.target.value }))}
              placeholder="Enter your social media profile link"
              className="bg-input border-border text-foreground"
            />
          </div>
          
          <div>
            <Label htmlFor="bankAccountDetails" className="text-foreground">Bank Account Details *</Label>
            <Textarea
              id="bankAccountDetails"
              value={formData.bankAccountDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, bankAccountDetails: e.target.value }))}
              placeholder="Enter your bank account details"
              className="bg-input border-border text-foreground min-h-[80px]"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-border hover:bg-accent"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Details'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};