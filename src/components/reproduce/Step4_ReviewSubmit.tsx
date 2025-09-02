import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
  requestData: ReproductionRequestData;
}

export const Step4_ReviewSubmit: React.FC<Props> = ({ onBack, requestData }) => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const submitMutation = useMutation({
    mutationFn: () => supabase.rpc('create_reproduction_request', {
        p_producer_id: requestData.producer!.id,
        p_original_track_url: requestData.originalTrackUrl!,
        p_user_vocal_recording_url: requestData.vocalRecordingUrl!,
        p_price_in_credits: requestData.producer!.price,
    }),
    onSuccess: (data) => {
        if (data.error) {
            throw new Error(data.error.message);
        }
        toast.success("Your request has been submitted!");
        refreshProfile(); // To update credit balance in UI
        navigate('/my-requests');
    },
    onError: (error: Error) => {
        toast.error(`Submission failed: ${error.message}`);
    }
  });

  if (!requestData.producer || !requestData.originalTrackUrl || !requestData.vocalRecordingUrl) {
      return (
          <div>
              <p>Something went wrong. Please go back and complete all previous steps.</p>
              <Button onClick={onBack} variant="outline" className="mt-4">Back</Button>
          </div>
      )
  }

  const userHasEnoughCredits = user && user.credits && user.credits >= requestData.producer.price;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 4: Review and Submit</h2>
      <p className="text-muted-foreground mb-6">Please review the details of your request. Upon submission, {requestData.producer.price} credits will be deducted from your account and held securely in escrow.</p>

      <Card>
          <CardHeader>
              <CardTitle>Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Producer:</span> <strong>{requestData.producer.name}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price:</span> <strong>{requestData.producer.price} credits</strong></div>
              <hr className="my-2"/>
              <div className="flex justify-between font-bold"><span className="text-muted-foreground">Your Current Balance:</span> <span>{user?.credits ?? 0} credits</span></div>
              {!userHasEnoughCredits && <p className="text-red-500 text-sm">You do not have enough credits. Please purchase more before submitting.</p>}
          </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !userHasEnoughCredits}
        >
          {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm & Submit
        </Button>
      </div>
    </div>
  );
};
