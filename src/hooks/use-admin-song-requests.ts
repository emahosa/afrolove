
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomSongRequest, CustomSongLyrics } from './use-custom-song-requests';

export const useAdminSongRequests = () => {
  const [allRequests, setAllRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllRequests = async () => {
    try {
      console.log('Admin: Fetching all custom song requests...');
      setError(null);
      
      // First check if user is authenticated and has admin role
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Admin: Current user:', user?.id, user?.email);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      console.log('Admin: Role check result:', roleData, roleError);

      if (roleError) {
        console.error('Admin: Error checking role:', roleError);
      }

      // Fetch requests with detailed logging
      const { data, error, count } = await supabase
        .from('custom_song_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Admin: Query result - Data:', data, 'Error:', error, 'Count:', count);

      if (error) {
        console.error('Admin: Error fetching requests:', error);
        setError(`Failed to fetch requests: ${error.message}`);
        throw error;
      }
      
      console.log(`Admin: Successfully fetched ${data?.length || 0} requests:`, data);
      setAllRequests(data || []);
      
      if (!data || data.length === 0) {
        console.log('Admin: No requests found - this could mean:');
        console.log('1. No requests have been created yet');
        console.log('2. RLS policies are blocking access');
        console.log('3. User does not have admin role');
      }
      
    } catch (error: any) {
      console.error('Admin: Error in fetchAllRequests:', error);
      setError(error.message || 'Failed to load song requests');
      toast.error('Failed to load song requests', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: CustomSongRequest['status']) => {
    try {
      console.log('Admin: Updating request status:', { requestId, status });
      
      const { error } = await supabase
        .from('custom_song_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) {
        console.error('Admin: Error updating status:', error);
        throw error;
      }
      
      await fetchAllRequests();
      toast.success('Request status updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status', {
        description: error.message
      });
      return false;
    }
  };

  const addLyrics = async (requestId: string, lyricsText: string, version: number) => {
    try {
      console.log('Admin: Adding lyrics:', { requestId, version });
      
      const { error } = await supabase
        .from('custom_song_lyrics')
        .insert({
          request_id: requestId,
          lyrics: lyricsText,
          version,
          is_selected: false
        });

      if (error) {
        console.error('Admin: Error adding lyrics:', error);
        throw error;
      }
      
      toast.success(`Lyrics version ${version} added successfully`);
      return true;
    } catch (error: any) {
      console.error('Error adding lyrics:', error);
      toast.error('Failed to add lyrics', {
        description: error.message
      });
      return false;
    }
  };

  const fetchLyricsForRequest = async (requestId: string): Promise<CustomSongLyrics[]> => {
    try {
      console.log('Admin: Fetching lyrics for request:', requestId);
      
      const { data, error } = await supabase
        .from('custom_song_lyrics')
        .select('*')
        .eq('request_id', requestId)
        .order('version', { ascending: true });

      if (error) {
        console.error('Admin: Error fetching lyrics:', error);
        throw error;
      }
      
      console.log('Admin: Fetched lyrics:', data);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching lyrics:', error);
      return [];
    }
  };

  // Test database connectivity
  const testConnection = async () => {
    try {
      console.log('Admin: Testing database connection...');
      const { data, error } = await supabase
        .from('custom_song_requests')
        .select('count', { count: 'exact', head: true });
      
      console.log('Admin: Connection test result:', { data, error });
      return !error;
    } catch (error) {
      console.error('Admin: Connection test failed:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('Admin: Setting up requests fetching and real-time subscription');
    
    // Test connection first
    testConnection().then(isConnected => {
      console.log('Admin: Database connection status:', isConnected);
      if (isConnected) {
        fetchAllRequests();
      } else {
        setError('Failed to connect to database');
        setLoading(false);
      }
    });

    // Set up real-time subscription for all requests
    const channel = supabase
      .channel('admin_song_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_song_requests'
      }, (payload) => {
        console.log('Admin: Real-time update received:', payload);
        fetchAllRequests();
      })
      .subscribe();

    return () => {
      console.log('Admin: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    allRequests,
    loading,
    error,
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest,
    refetch: fetchAllRequests
  };
};
