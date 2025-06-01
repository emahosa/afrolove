
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserSongRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'lyrics_proposed' | 'lyrics_selected' | 'audio_uploaded' | 'completed';
  created_at: string;
  updated_at: string;
  user_id: string;
  genre_id: string | null;
  genre?: {
    id: string;
    name: string;
    description?: string;
  };
}

export const useUserSongRequests = () => {
  const { user } = useAuth();
  const [userRequests, setUserRequests] = useState<UserSongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRequests = async () => {
    if (!user) {
      setLoading(false);
      setUserRequests([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('User: Fetching user song requests...');

      const { data, error } = await supabase
        .from('custom_song_requests')
        .select(`
          *,
          genre:genres(id, name, description)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('User: Error fetching requests:', error);
        throw error;
      }

      console.log('User: Fetched requests:', data);
      setUserRequests(data || []);
    } catch (error: any) {
      console.error('User: Error in fetchUserRequests:', error);
      setError(error.message || 'Failed to load requests');
      toast.error('Failed to load custom song requests');
    } finally {
      setLoading(false);
    }
  };

  const createSongRequest = async (title: string, description: string, genreId?: string) => {
    if (!user) {
      toast.error('You must be logged in to create a request');
      return false;
    }

    try {
      console.log('User: Creating song request:', { title, description, genreId, userId: user.id });

      const requestData: any = {
        title,
        description,
        user_id: user.id,
      };

      if (genreId) {
        requestData.genre_id = genreId;
      }

      const { data, error } = await supabase
        .from('custom_song_requests')
        .insert([requestData])
        .select(`
          *,
          genre:genres(id, name, description)
        `)
        .single();

      if (error) {
        console.error('User: Error creating request:', error);
        throw error;
      }

      console.log('User: Created request:', data);
      
      // Add to local state
      setUserRequests(prev => [data, ...prev]);
      
      return true;
    } catch (error: any) {
      console.error('User: Error in createSongRequest:', error);
      toast.error('Failed to create song request', {
        description: error.message
      });
      return false;
    }
  };

  const refetch = () => {
    fetchUserRequests();
  };

  useEffect(() => {
    fetchUserRequests();
  }, [user]);

  return {
    userRequests,
    loading,
    error,
    createSongRequest,
    refetch
  };
};
