
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateCustomSongRequest {
  title: string;
  description: string;
  genreId: string;
}

export const useCreateCustomSong = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createCustomSong = async (request: CreateCustomSongRequest) => {
    if (!user) {
      toast.error('You must be logged in to request a custom song.');
      return null;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('custom_song_requests')
        .insert({
          user_id: user.id,
          title: request.title,
          description: request.description,
          genre_id: request.genreId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Custom song requested successfully!');
      return data;
    } catch (error: any) {
      toast.error('Failed to request custom song.', {
        description: error.message,
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createCustomSong, isCreating };
};
