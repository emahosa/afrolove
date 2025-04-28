
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Key Management</h2>
        <Button>Add New API</Button>
      </div>
      <div className="grid gap-4">
        {apiKeys.map((api) => (
          <Card key={api.id}>
            <CardHeader className="pb-2">
              <CardTitle>{api.name}</CardTitle>
              <CardDescription>API Integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">API Key</div>
                  <div className="font-mono text-sm">{api.key}</div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button variant="outline" size="sm">
                    Reveal Key
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={api.status === "active" ? "text-green-500" : "text-muted-foreground"}
                  >
                    {getButtonContent(api.status)}
                  </Button>
                  <Button variant="outline" size="sm">
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
