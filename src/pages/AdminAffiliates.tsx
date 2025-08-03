
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const AdminAffiliates = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Affiliate Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Affiliates</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Affiliate management interface goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAffiliates;
