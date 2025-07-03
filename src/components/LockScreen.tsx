import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface LockScreenProps {
  message?: string;
  subscribePath?: string;
  buttonText?: string;
}

const LockScreen: React.FC<LockScreenProps> = ({
  message = "Subscribe to access this feature.",
  subscribePath = "/subscribe",
  buttonText = "Subscribe Now"
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-secondary/20 p-3 rounded-full w-fit mb-4">
            <Lock size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">Feature Locked</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-lg mb-6">
            {message}
          </CardDescription>
          <Button
            size="lg"
            onClick={() => navigate(subscribePath)}
            className="w-full"
          >
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LockScreen;
