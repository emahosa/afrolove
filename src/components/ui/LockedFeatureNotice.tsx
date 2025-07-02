import React from 'react';
import { Button } from './button'; // Assuming shadcn/ui button
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LockedFeatureNoticeProps {
  message?: string;
  buttonText?: string;
  redirectPath?: string;
}

const LockedFeatureNotice: React.FC<LockedFeatureNoticeProps> = ({
  message = "Subscribe to access this feature.",
  buttonText = "Go to Subscription",
  redirectPath = "/subscribe"
}) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate(redirectPath);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
      <Lock size={64} className="text-primary mb-6" />
      <h2 className="text-2xl font-semibold mb-3">Feature Locked</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {message}
      </p>
      <Button onClick={handleRedirect} size="lg">
        {buttonText}
      </Button>
    </div>
  );
};

export default LockedFeatureNotice;
