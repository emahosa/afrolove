
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomSongRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  genre_id: string | null;
  status: 'pending' | 'lyrics_proposed' | 'lyrics_selected' | 'audio_uploaded' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CustomSongLyrics {
  id: string;
  request_id: string;
  lyrics: string;
  version: number;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useAdminSongRequests = () => {
  const [allRequests, setAllRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllRequests = async () => {
    try {
      console.log('Admin: Fetching all custom song requests...');
      setError(null);
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Admin: Error getting user:', userError);
        throw new Error('Authentication error: ' + userError.message);
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Super admin bypass - don't check roles table for ellaadahosa@gmail.com
      const isSuperAdmin = user.email === "ellaadahosa@gmail.com";
      console.log('Admin: Is super admin:', isSuperAdmin);
      
      if (!isSuperAdmin) {
        // Check admin role for non-super admins
        console.log('Admin: Checking admin role for user:', user.id);
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roleError || !roleData) {
          console.warn('Admin: User does not have admin role');
          throw new Error('Access denied: Admin role required');
        }
      }

      // Fetch all custom song requests
      console.log('Admin: Fetching custom song requests from database...');
      
      const { data: requests, error: fetchError } = await supabase
        .from('custom_song_requests')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Admin: Raw query result:', { requests, fetchError });

      if (fetchError) {
        console.error('Admin: Error fetching requests:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }
      
      console.log(`Admin: Successfully fetched ${requests?.length || 0} requests`);
      setAllRequests(requests || []);
      
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
      
      // Refresh the requests list
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

  useEffect(() => {
    console.log('Admin: Setting up requests fetching and real-time subscription');
    
    // Initial fetch
    fetchAllRequests();

    // Set up real-time subscription for custom song requests
    const channel = supabase
      .channel('admin_custom_song_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_song_requests'
      }, (payload) => {
        console.log('Admin: Real-time update received:', payload);
        // Refresh requests when there are changes
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
