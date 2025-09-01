
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const AffiliateWallet = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Wallet</CardTitle>
        <CardDescription>
          View your affiliate earnings and balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Affiliate wallet system is currently being set up. This feature will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AffiliateWallet;
