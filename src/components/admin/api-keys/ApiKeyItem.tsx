
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader, X, AlertTriangle } from 'lucide-react';
import { ApiKey } from './types';
import { apiProviders } from './types';
import { maskApiKey, getBadgeVariant, getBadgeText, verifyApiKey } from './utils';

interface ApiKeyItemProps {
  api: ApiKey;
  getButtonContent: (status: string) => React.ReactNode;
  handleDelete: (id: number) => void;
  verificationResults: Record<number, string>;
  keys: ApiKey[];
  setKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
  setVerificationResults: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  isVerifying: number | null;
  setIsVerifying: React.Dispatch<React.SetStateAction<number | null>>;
}

const ApiKeyItem = ({
  api,
  getButtonContent,
  handleDelete,
  verificationResults,
  keys,
  setKeys,
  setVerificationResults,
  isVerifying,
  setIsVerifying
}: ApiKeyItemProps) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // Function to get provider display name
  const getProviderName = (providerId: string) => {
    return apiProviders.find(p => p.id === providerId)?.name || providerId;
  };

  const handleToggleStatus = () => {
    setKeys(keys.map(key => {
      if (key.id === api.id) {
        const newStatus = key.status === 'active' ? 'inactive' : 'active';
        return { ...key, status: newStatus };
      }
      return key;
    }));
  };

  const handleVerifyApiKey = async (apiId: number) => {
    setIsVerifying(apiId);
    await verifyApiKey(apiId, keys, setKeys, setVerificationResults, apiProviders);
    setIsVerifying(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{api.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getProviderName(api.provider)}
              <Badge variant={getBadgeVariant(api.status)}>
                {getBadgeText(api.status)}
              </Badge>
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleDelete(api.id)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">API Key</div>
            <div className="font-mono text-sm">
              {isRevealed ? api.key : maskApiKey(api.key)}
            </div>
            {api.lastVerified && (
              <div className="text-xs text-muted-foreground mt-1">
                Last verified: {new Date(api.lastVerified).toLocaleString()}
              </div>
            )}
            {verificationResults[api.id] && api.status === 'invalid' && (
              <div className="text-xs text-red-500 mt-1">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {verificationResults[api.id]}
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsRevealed(!isRevealed)}
            >
              {isRevealed ? 'Hide Key' : 'Reveal Key'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className={api.status === "active" ? "text-green-500" : "text-muted-foreground"}
              onClick={handleToggleStatus}
              disabled={api.status === 'invalid'}
            >
              {getButtonContent(api.status)}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleVerifyApiKey(api.id)}
              disabled={isVerifying === api.id}
            >
              {isVerifying === api.id ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Key'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyItem;
