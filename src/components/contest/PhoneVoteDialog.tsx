
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PhoneVoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoteSubmit: (phone: string) => Promise<boolean>;
  entryTitle: string;
}

export const PhoneVoteDialog = ({ open, onOpenChange, onVoteSubmit, entryTitle }: PhoneVoteDialogProps) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async () => {
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, you'd send an OTP here
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('otp');
      toast.success('OTP sent to your phone');
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, you'd verify the OTP here
      // For now, we'll accept any 4+ digit code
      if (otp.length < 4) {
        toast.error('Invalid OTP');
        return;
      }

      const success = await onVoteSubmit(phone);
      if (success) {
        onOpenChange(false);
        setPhone('');
        setOtp('');
        setStep('phone');
      }
    } catch (error) {
      toast.error('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone('');
    setOtp('');
    setStep('phone');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vote for "{entryTitle}"</DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? 'Enter your phone number to receive a verification code'
              : 'Enter the verification code sent to your phone'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 xxx xxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button 
                onClick={handlePhoneSubmit} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 4-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('phone')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleOtpSubmit} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Verifying...' : 'Submit Vote'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
