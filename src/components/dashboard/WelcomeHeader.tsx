
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Music } from 'lucide-react';

const WelcomeHeader = () => {
  const { user } = useAuth();

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Ready to create some amazing music today?
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeHeader;
