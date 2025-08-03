
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Trophy, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => navigate('/create')}
          className="w-full flex items-center justify-start gap-2"
          variant="outline"
        >
          <Music className="h-4 w-4" />
          Create New Song
        </Button>
        <Button
          onClick={() => navigate('/contests')}
          className="w-full flex items-center justify-start gap-2"
          variant="outline"
        >
          <Trophy className="h-4 w-4" />
          View Contests
        </Button>
        <Button
          onClick={() => navigate('/credits')}
          className="w-full flex items-center justify-start gap-2"
          variant="outline"
        >
          <Zap className="h-4 w-4" />
          Buy Credits
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
