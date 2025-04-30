
export interface ApiKey {
  id: number;
  provider: string;
  name: string;
  key: string;
  status: string;
  lastVerified?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  verificationHeaders: {
    [key: string]: string;
  };
}

export const apiProviders: ApiProvider[] = [
  { 
    id: 'suno', 
    name: 'Suno AI', 
    description: 'Music generation AI', 
    endpoint: 'https://api.suno.com/api/v1/status',
    verificationHeaders: {
      'Authorization': 'Bearer {API_KEY}',
      'Content-Type': 'application/json'
    }
  },
  { 
    id: 'elevenlabs', 
    name: 'ElevenLabs', 
    description: 'Voice cloning AI', 
    endpoint: 'https://api.elevenlabs.io/v1/user',
    verificationHeaders: {
      'xi-api-key': '{API_KEY}',
      'Content-Type': 'application/json'
    }
  },
  { 
    id: 'lalaiai', 
    name: 'Lalal.ai', 
    description: 'Vocal/Instrumental splitting', 
    endpoint: 'https://api.lalal.ai/status',
    verificationHeaders: {
      'Authorization': 'Bearer {API_KEY}',
      'Content-Type': 'application/json'
    }
  },
];
