
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Genre {
  id: string;
  name: string;
  prompt_template: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  audio_preview_url?: string;
  cover_image_url?: string;
  sample_prompt?: string;
}

export const useGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      console.log("Fetching genres...");
      
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error("Error fetching genres:", error);
        throw error;
      }
      
      console.log("Genres fetched successfully:", data);
      setGenres(data || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
      setError('Failed to load genres');
    } finally {
      setLoading(false);
    }
  };

  const createGenre = async (genreData: { 
    name: string; 
    prompt_template: string; 
    description?: string;
    audio_preview_url?: string;
    cover_image_url?: string;
    sample_prompt?: string;
  }) => {
    try {
      console.log("Creating genre:", genreData);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError);
        throw new Error("You must be logged in to create genres");
      }
      
      const insertData = {
        name: genreData.name,
        prompt_template: genreData.prompt_template,
        description: genreData.description || null,
        audio_preview_url: genreData.audio_preview_url || null,
        cover_image_url: genreData.cover_image_url || null,
        sample_prompt: genreData.sample_prompt || null,
        is_active: true
      };
      
      console.log("Inserting data:", insertData);
      
      const { data, error } = await supabase
        .from('genres')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Error creating genre:", error);
        throw error;
      }
      
      console.log("Genre created successfully:", data);
      setGenres(prev => [...prev, data]);
      toast.success('Genre created successfully!');
      return data;
    } catch (error: any) {
      console.error('Error creating genre:', error);
      const errorMessage = error.message || 'Failed to create genre';
      toast.error('Failed to create genre', {
        description: errorMessage
      });
      throw error;
    }
  };

  const updateGenre = async (id: string, updates: Partial<Genre>) => {
    try {
      console.log("Updating genre:", id, updates);
      
      const { data, error } = await supabase
        .from('genres')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating genre:", error);
        throw error;
      }
      
      console.log("Genre updated successfully:", data);
      setGenres(prev => prev.map(g => g.id === id ? data : g));
      toast.success('Genre updated successfully!');
      return data;
    } catch (error: any) {
      console.error('Error updating genre:', error);
      const errorMessage = error.message || 'Failed to update genre';
      toast.error('Failed to update genre', {
        description: errorMessage
      });
      throw error;
    }
  };

  const deleteGenre = async (id: string) => {
    try {
      console.log("Deleting genre:", id);
      
      const { error } = await supabase
        .from('genres')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error("Error deleting genre:", error);
        throw error;
      }
      
      console.log("Genre deleted successfully");
      setGenres(prev => prev.filter(g => g.id !== id));
      toast.success('Genre deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting genre:', error);
      const errorMessage = error.message || 'Failed to delete genre';
      toast.error('Failed to delete genre', {
        description: errorMessage
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  return {
    genres,
    loading,
    error,
    createGenre,
    updateGenre,
    deleteGenre,
    refetch: fetchGenres
  };
};
