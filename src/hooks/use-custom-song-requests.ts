
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomSongRequest {
  id: string;
  user_id: string;
  genre: string;
  description: string;
  status: 'pending' | 'lyrics_uploaded' | 'instrumental_ready' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CustomSongLyrics {
  id: string;
  request_id: string;
  lyrics_text: string;
  version: number;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export const useCustomSongRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomSongRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_song_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching user requests:', error);
      toast.error('Failed to load your custom song requests');
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (genre: string, description: string) => {
    if (!user) {
      toast.error('You must be logged in to create a request');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('custom_song_requests')
        .insert({
          user_id: user.id,
          genre,
          description,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Custom song request submitted successfully!');
      await fetchUserRequests(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to submit custom song request');
      return null;
    }
  };

  const updateRequestStatus = async (requestId: string, status: CustomSongRequest['status']) => {
    try {
      const { error } = await supabase
        .from('custom_song_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchUserRequests(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
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
      toast.error('Failed to load lyrics');
      return [];
    }
  };

  const selectLyrics = async (lyricsId: string, requestId: string) => {
    try {
      // First, unselect all lyrics for this request
      await supabase
        .from('custom_song_lyrics')
        .update({ is_selected: false })
        .eq('request_id', requestId);

      // Then select the chosen lyrics
      const { error } = await supabase
        .from('custom_song_lyrics')
        .update({ is_selected: true })
        .eq('id', lyricsId);

      if (error) throw error;

      // Update request status to instrumental_ready
      await updateRequestStatus(requestId, 'instrumental_ready');
      
      toast.success('Lyrics selected successfully!');
      return true;
    } catch (error) {
      console.error('Error selecting lyrics:', error);
      toast.error('Failed to select lyrics');
      return false;
    }
  };

  useEffect(() => {
    fetchUserRequests();

    // Set up real-time subscription for user's requests
    if (user) {
      const channel = supabase
        .channel('custom_song_requests_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'custom_song_requests',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchUserRequests(); // Refresh when changes occur
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    requests,
    loading,
    createRequest,
    updateRequestStatus,
    fetchLyricsForRequest,
    selectLyrics,
    refetch: fetchUserRequests
  };
};
