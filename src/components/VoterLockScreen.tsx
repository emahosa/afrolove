import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface VoterLockScreenProps {
  feature?: string;
  message?: string;
}

const VoterLockScreen: React.FC<VoterLockScreenProps> = ({
  feature = "this feature",
  message
}) => {
  const navigate = useNavigate();

  const defaultMessage = `Subscribe to access ${feature}.`;
  const displayMessage = message || defaultMessage;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Lock size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">Feature Locked</CardTitle>
          <CardDescription className="text-muted-foreground">
            You're currently on a Voter account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg mb-6">
            {displayMessage}
          </p>
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => navigate("/subscribe")}
              className="w-full"
            >
              Subscribe Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/contest")}
              className="w-full"
            >
              Go to Contest (Available)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoterLockScreen;