
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Key } from 'lucide-react';

interface EmptyApiKeyStateProps {
  onAddNewClick: () => void;
}

const EmptyApiKeyState = ({ onAddNewClick }: EmptyApiKeyStateProps) => {
  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center justify-center h-40 text-center">
        <Key className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium">No API Keys Added</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add API keys from Suno, ElevenLabs, or Lalal.ai to enable AI features
        </p>
        <Button onClick={onAddNewClick} className="mt-4">Add API Key</Button>
      </CardContent>
    </Card>
  );
};

export default EmptyApiKeyState;
