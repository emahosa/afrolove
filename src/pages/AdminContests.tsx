
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

const AdminContests = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Contest Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contests</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Contest management interface goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContests;
