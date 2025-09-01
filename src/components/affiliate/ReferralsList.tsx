
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const ReferralsList = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referrals List</CardTitle>
        <CardDescription>
          View all users you've referred to the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Referrals tracking system is currently being set up. This feature will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ReferralsList;
