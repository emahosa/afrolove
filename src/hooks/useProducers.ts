
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Producer } from '@/types/producer';
import { toast } from 'sonner';

export const useProducers = () => {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('producers')
        .select(`
          *,
          profile:profiles!producers_user_id_fkey(
            full_name,
            username
          )
        `)
        .eq('status', 'approved')
        .order('rating', { ascending: false });

      if (error) throw error;
      setProducers(data || []);
    } catch (err: any) {
      console.error('Error fetching producers:', err);
      setError(err.message);
      toast.error('Failed to load producers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducers();
  }, []);

  return {
    producers,
    loading,
    error,
    refetch: fetchProducers
  };
};

export const useProducerApplication = () => {
  const [loading, setLoading] = useState(false);

  const submitApplication = async (applicationData: {
    business_name?: string;
    social_media_links: Record<string, string>;
    id_document_url?: string;
    min_price_credits: number;
    max_price_credits: number;
    portfolio_tracks?: string[];
  }) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('producers')
        .insert({
          user_id: user.id,
          ...applicationData
        });

      if (error) throw error;
      
      toast.success('Producer application submitted successfully!');
      return true;
    } catch (err: any) {
      console.error('Error submitting producer application:', err);
      toast.error(err.message || 'Failed to submit application');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitApplication,
    loading
  };
};
