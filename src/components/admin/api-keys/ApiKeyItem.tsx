import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader, X, AlertTriangle, Edit, Save } from 'lucide-react';
import { ApiKey } from './types';
import { apiProviders } from './types';
import { maskApiKey, getBadgeVariant, getBadgeText, verifyApiKey } from './utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedKey, setEditedKey] = useState(api.key);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedKey(api.key);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedKey(api.key);
  };

  const handleSaveEdit = async () => {
    if (!editedKey.trim()) {
      toast.error('API key cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      
      // Update the API key in Supabase secrets
      const { error } = await supabase.functions.invoke('update-api-key', {
        body: {
          keyName: `${api.provider.toUpperCase()}_API_KEY`,
          newValue: editedKey.trim()
        }
      });

      if (error) {
        throw error;
      }

      // Update local state
      setKeys(keys.map(key => {
        if (key.id === api.id) {
          return { ...key, key: editedKey.trim(), status: 'active' };
        }
        return key;
      }));

      setIsEditing(false);
      toast.success('API key updated successfully');
      
    } catch (error: any) {
      console.error('Error updating API key:', error);
      toast.error('Failed to update API key: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleStartEdit}
              disabled={isEditing || isSaving}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDelete(api.id)}
              disabled={isEditing || isSaving}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">API Key</div>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedKey}
                  onChange={(e) => setEditedKey(e.target.value)}
                  placeholder="Enter new API key"
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="font-mono text-sm">
                {isRevealed ? api.key : maskApiKey(api.key)}
              </div>
            )}
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
          
          {!isEditing && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyItem;
