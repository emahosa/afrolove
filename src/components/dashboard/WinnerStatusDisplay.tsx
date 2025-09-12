import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WinnerClaim {
  id: string;
  contest_id: string;
  full_name: string;
  address: string;
  phone_number: string;
  social_media_link: string | null;
  bank_account_details: string;
  submitted_at: string;
  status: 'Pending' | 'Processing' | 'Fulfilled';
  contest: {
    name: string;
  } | null;
}

const WinnerStatusDisplay = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<WinnerClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWinnerClaims = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: claimsError } = await supabase
          .from('winner_claim_details')
          .select(`
            *,
            contest:contests(name)
          `)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false });

        if (claimsError) {
          throw claimsError;
        }

        setClaims(data || []);
      } catch (err: any) {
        console.error('Error fetching winner claims:', err);
        setError('Failed to fetch your winner information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWinnerClaims();
  }, [user]);

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (claims.length === 0) {
    return (
      <Alert>
        <AlertTitle>No Winnings Found</AlertTitle>
        <AlertDescription>
          It looks like you haven't won any contests yet. Keep creating and participating!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {claims.map((claim) => (
        <Card key={claim.id} className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold text-primary">
                  {claim.contest?.name || 'Contest Prize'}
                </CardTitle>
                <CardDescription>
                  Claim submitted on {new Date(claim.submitted_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(claim.status)} className="capitalize">
                {claim.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-white">Your Submitted Details</h4>
              <div className="mt-2 p-4 rounded-md bg-muted/50 border border-border text-sm text-muted-foreground space-y-3">
                <p><strong>Full Name:</strong> {claim.full_name}</p>
                <p><strong>Address:</strong> {claim.address}</p>
                <p><strong>Phone:</strong> {claim.phone_number}</p>
                {claim.social_media_link && <p><strong>Social Media:</strong> {claim.social_media_link}</p>}
                <p className="whitespace-pre-wrap"><strong>Bank Details:</strong> {claim.bank_account_details}</p>
              </div>
            </div>
            {claim.status === 'Fulfilled' && (
              <Alert className="border-green-500/50 bg-green-500/10 text-green-300">
                <AlertTitle className="text-green-200">Prize Fulfilled!</AlertTitle>
                <AlertDescription>
                  Congratulations! Your prize for this contest has been sent. If you have any issues, please contact support.
                </AlertDescription>
              </Alert>
            )}
            {claim.status === 'Processing' && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-300">
                <AlertTitle className="text-yellow-200">Processing</AlertTitle>
                <AlertDescription>
                  We have received your details and are currently processing your prize. This may take a few business days.
                </AlertDescription>
              </Alert>
            )}
            {claim.status === 'Pending' && (
              <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-300">
                <AlertTitle className="text-red-200">Action Required</AlertTitle>
                <AlertDescription>
                  Your claim is pending review. Please ensure all your submitted details are correct.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WinnerStatusDisplay;
