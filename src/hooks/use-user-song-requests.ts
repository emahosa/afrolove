
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomSongRequest } from './use-admin-song-requests';

export const useUserSongRequests = () => {
  const [userRequests, setUserRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRequests = async () => {
    try {
      console.log('User: Starting to fetch user custom song requests...');
      setError(null);
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User: Error getting user:', userError);
        throw new Error('Authentication error: ' + userError.message);
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('User: Current user:', user.email, user.id);

      // Fetch user's custom song requests
      console.log('User: Fetching user custom song requests from database...');
      
      const { data: requests, error: fetchError } = await supabase
        .from('custom_song_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('User: Error fetching requests:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }
      
      console.log(`User: Successfully fetched ${requests?.length || 0} requests:`, requests);
      setUserRequests(requests || []);
      
    } catch (error: any) {
      console.error('User: Error in fetchUserRequests:', error);
      setError(error.message || 'Failed to load song requests');
      toast.error('Failed to load song requests', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createSongRequest = async (title: string, description: string, genreId?: string) => {
    try {
      console.log('User: Creating new song request:', { title, description, genreId });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('custom_song_requests')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          genre_id: genreId || null,
          status: 'pending'
        });

      if (error) {
        console.error('User: Error creating request:', error);
        throw error;
      }
      
      // Refresh the requests list
      await fetchUserRequests();
      toast.success('Song request submitted successfully!');
      return true;
    } catch (error: any) {
      console.error('User: Error creating song request:', error);
      toast.error('Failed to submit song request', {
        description: error.message
      });
      return false;
    }
  };

  useEffect(() => {
    console.log('User: Setting up user requests fetching and real-time subscription');
    
    // Initial fetch
    fetchUserRequests();

    // Set up real-time subscription for user's custom song requests
    const channel = supabase
      .channel('user_custom_song_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_song_requests'
      }, (payload) => {
        console.log('User: Real-time update received:', payload);
        // Refresh requests when there are changes
        fetchUserRequests();
      })
      .subscribe();

    return () => {
      console.log('User: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    userRequests,
    loading,
    error,
    createSongRequest,
    refetch: fetchUserRequests
  };
};
