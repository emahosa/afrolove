
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const AffiliateLinks = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Links</CardTitle>
        <CardDescription>
          Manage your affiliate referral links
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Affiliate system is currently being set up. This feature will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default AffiliateLinks;
