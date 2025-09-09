
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GenreTemplate {
  id: string;
  genre_id: string;
  template_name: string;
  admin_prompt: string;
  user_prompt_guide?: string;
  audio_url?: string;
  cover_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  genres?: {
    name: string;
  };
}

export const useGenreTemplates = () => {
  const [templates, setTemplates] = useState<GenreTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('genre_templates')
        .select(`
          *,
          genres (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching genre templates:', error);
      toast.error('Failed to fetch genre templates');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: {
    genre_id: string;
    template_name: string;
    admin_prompt: string;
    user_prompt_guide?: string;
    audio_url?: string;
    cover_image_url?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('genre_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Genre template created successfully');
      fetchTemplates();
      return data;
    } catch (error) {
      console.error('Error creating genre template:', error);
      toast.error('Failed to create genre template');
      throw error;
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<GenreTemplate>) => {
    try {
      const { error } = await supabase
        .from('genre_templates')
        .update({ ...templateData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Genre template updated successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error updating genre template:', error);
      toast.error('Failed to update genre template');
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('genre_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Genre template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting genre template:', error);
      toast.error('Failed to delete genre template');
      throw error;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
};
