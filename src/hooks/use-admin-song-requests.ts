
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomSongRequest, CustomSongLyrics } from './use-custom-song-requests';

export const useAdminSongRequests = () => {
  const [allRequests, setAllRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllRequests = async () => {
    try {
      console.log('Admin: Fetching all custom song requests...');
      
      const { data, error } = await supabase
        .from('custom_song_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Admin: Error fetching requests:', error);
        throw error;
      }
      
      console.log('Admin: Fetched requests:', data);
      setAllRequests(data || []);
    } catch (error) {
      console.error('Error fetching all requests:', error);
      toast.error('Failed to load song requests');
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
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
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
    } catch (error) {
      console.error('Error adding lyrics:', error);
      toast.error('Failed to add lyrics');
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
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      return [];
    }
  };

  useEffect(() => {
    console.log('Admin: Setting up requests fetching and real-time subscription');
    fetchAllRequests();

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
    updateRequestStatus,
    addLyrics,
    fetchLyricsForRequest,
    refetch: fetchAllRequests
  };
};
