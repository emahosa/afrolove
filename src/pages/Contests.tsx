
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

const Contests = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Contests</h1>
        <p className="text-muted-foreground">Participate in music contests and win prizes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No Active Contests</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Check back later for new contests.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contests;
