
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  status: string;
}

interface ApiKeyManagementProps {
  apiKeys: ApiKey[];
  getButtonContent: (status: string) => React.ReactNode;
}

export const ApiKeyManagement = ({ apiKeys, getButtonContent }: ApiKeyManagementProps) => {
  const [keys, setKeys] = useState<ApiKey[]>(apiKeys);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});

  const handleRevealKey = (apiId: number) => {
    setRevealedKeys(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
    toast.info(`Key visibility toggled`);
  };

  const handleToggleStatus = (apiId: number) => {
    setKeys(keys.map(api => {
      if (api.id === apiId) {
        const newStatus = api.status === 'active' ? 'inactive' : 'active';
        toast.success(`API key status changed to ${newStatus}`);
        return { ...api, status: newStatus };
      }
      return api;
    }));
  };

  const handleRegenerate = (apiId: number) => {
    toast.success(`API key regenerated`);
    // In a real app, this would regenerate the key
  };

  const handleAddNewApi = () => {
    toast.info("Adding new API key - this would open a form in a real application");
    // In a real app, this would open a form to add a new API key
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Key Management</h2>
        <Button onClick={handleAddNewApi}>Add New API</Button>
      </div>
      <div className="grid gap-4">
        {keys.map((api) => (
          <Card key={api.id}>
            <CardHeader className="pb-2">
              <CardTitle>{api.name}</CardTitle>
              <CardDescription>API Integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">API Key</div>
                  <div className="font-mono text-sm">
                    {revealedKeys[api.id] 
                      ? api.key.replace('*****', 'sk_live_abcdefgh12345') 
                      : api.key}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRevealKey(api.id)}
                  >
                    {revealedKeys[api.id] ? 'Hide Key' : 'Reveal Key'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={api.status === "active" ? "text-green-500" : "text-muted-foreground"}
                    onClick={() => handleToggleStatus(api.id)}
                  >
                    {getButtonContent(api.status)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRegenerate(api.id)}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
