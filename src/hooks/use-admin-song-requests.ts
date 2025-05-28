
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomSongRequest, CustomSongLyrics } from './use-custom-song-requests';

export const useAdminSongRequests = () => {
  const [allRequests, setAllRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_song_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      const { error } = await supabase
        .from('custom_song_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchAllRequests(); // Refresh the list
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
      const { error } = await supabase
        .from('custom_song_lyrics')
        .insert({
          request_id: requestId,
          lyrics_text: lyricsText,
          version,
          is_selected: false
        });

      if (error) throw error;
      
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
      const { data, error } = await supabase
        .from('custom_song_lyrics')
        .select('*')
        .eq('request_id', requestId)
        .order('version', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAllRequests();

    // Set up real-time subscription for all requests
    const channel = supabase
      .channel('admin_song_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_song_requests'
      }, () => {
        fetchAllRequests(); // Refresh when changes occur
      })
      .subscribe();

    return () => {
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
