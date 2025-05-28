
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
}

export const useGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGenres(data || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
      setError('Failed to load genres');
    } finally {
      setLoading(false);
    }
  };

  const createGenre = async (genreData: { name: string; prompt_template: string; description?: string }) => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .insert([{
          ...genreData,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGenres(prev => [...prev, data]);
      toast.success('Genre created successfully!');
      return data;
    } catch (error) {
      console.error('Error creating genre:', error);
      toast.error('Failed to create genre');
      throw error;
    }
  };

  const updateGenre = async (id: string, updates: Partial<Genre>) => {
    try {
      const { data, error } = await supabase
        .from('genres')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setGenres(prev => prev.map(g => g.id === id ? data : g));
      toast.success('Genre updated successfully!');
      return data;
    } catch (error) {
      console.error('Error updating genre:', error);
      toast.error('Failed to update genre');
      throw error;
    }
  };

  const deleteGenre = async (id: string) => {
    try {
      const { error } = await supabase
        .from('genres')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      setGenres(prev => prev.filter(g => g.id !== id));
      toast.success('Genre deleted successfully!');
    } catch (error) {
      console.error('Error deleting genre:', error);
      toast.error('Failed to delete genre');
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
