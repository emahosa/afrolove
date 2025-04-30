
import { ApiKey } from './types';
import { toast } from 'sonner';

export const maskApiKey = (key: string): string => {
  if (key.length <= 8) return '*'.repeat(key.length);
  return '*'.repeat(key.length - 8) + key.slice(-8);
};

export const getBadgeVariant = (status: string): "success" | "pending" | "warning" | "invalid" | "outline" | "default" | "destructive" | "secondary" => {
  switch (status) {
    case 'active': return 'success';
    case 'pending': return 'pending';
    case 'inactive': return 'warning';
    case 'invalid': return 'invalid';
    default: return 'outline';
  }
};

export const getBadgeText = (status: string): string => {
  switch (status) {
    case 'active': return 'Verified';
    case 'pending': return 'Pending';
    case 'inactive': return 'Inactive';
    case 'invalid': return 'Invalid';
    default: return 'Unknown';
  }
};

export const verifyApiKey = async (
  apiId: number, 
  keys: ApiKey[], 
  setKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>,
  setVerificationResults: React.Dispatch<React.SetStateAction<Record<number, string>>>,
  apiProviders: any[]
): Promise<void> => {
  const apiKey = keys.find(key => key.id === apiId);
  
  if (!apiKey) {
    return;
  }
  
  const provider = apiProviders.find(p => p.id === apiKey.provider);
  if (!provider) {
    toast.error("Provider configuration not found");
    return;
  }
  
  try {
    // Simulate API call with timeout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate verification result based on key format and length
    let isValid = false;
    let verificationMessage = "Invalid API key format";
    
    // Simple validation patterns for demo purposes
    if (apiKey.provider === 'suno' && apiKey.key.startsWith('suno_')) {
      isValid = true;
      verificationMessage = "Suno API key verified successfully";
    } else if (apiKey.provider === 'elevenlabs' && apiKey.key.length > 20) {
      isValid = true;
      verificationMessage = "ElevenLabs API key verified successfully";
    } else if (apiKey.provider === 'lalaiai' && apiKey.key.includes('-')) {
      isValid = true;
      verificationMessage = "Lalal.ai API key verified successfully";
    }
    
    // Update key status with verification result
    setKeys(keys.map(key => {
      if (key.id === apiId) {
        return {
          ...key,
          status: isValid ? 'active' : 'invalid',
          lastVerified: isValid ? new Date().toISOString() : undefined
        };
      }
      return key;
    }));
    
    setVerificationResults(prev => ({
      ...prev,
      [apiId]: verificationMessage
    }));
    
    if (isValid) {
      toast.success(`${provider.name} API key verified successfully`);
    } else {
      toast.error(`API key validation failed: ${verificationMessage}`);
    }
  } catch (error) {
    setKeys(keys.map(key => {
      if (key.id === apiId) {
        return {
          ...key,
          status: 'invalid'
        };
      }
      return key;
    }));
    toast.error(`Failed to verify API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
