import { supabase } from '@/integrations/supabase/client';

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
  }
}

export const fetchContent = async (): Promise<ContentItem[]> => {
  const { data, error } = await supabase
    .from('content')
    .select(`
      id,
      title,
      type,
      status,
      created_at,
      author_id,
      profiles (
        full_name
      )
    `);

  if (error) {
    console.error('Error fetching content:', error);
    throw error;
  }

  return data as ContentItem[];
};

export const addContent = async (title: string, type: string, content: string, author_id: string) => {
  const { data, error } = await supabase
    .from('content')
    .insert([{ title, type, content, author_id, status: 'draft' }])
    .select();

  if (error) {
    console.error('Error adding content:', error);
    throw error;
  }

  return data[0];
};

export const updateContent = async (id: string, updates: Partial<ContentItem>) => {
  const { data, error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating content:', error);
    throw error;
  }

  return data[0];
};

export const deleteContent = async (id: string) => {
  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
};
