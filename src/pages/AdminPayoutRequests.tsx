
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const AdminPayoutRequests = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Payout Requests</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Payout requests management interface goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayoutRequests;
