
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const EarningsInfo = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Information</CardTitle>
        <CardDescription>
          Overview of your affiliate earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Earnings information system is currently being set up. This feature will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default EarningsInfo;
