
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const EarningsBreakdown = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Breakdown</CardTitle>
        <CardDescription>
          Detailed breakdown of your affiliate earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Earnings tracking system is currently being set up. This feature will be available soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default EarningsBreakdown;
