
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReproductionRequest } from '@/types/producer';
import { toast } from 'sonner';
import { updateUserCredits } from '@/utils/credits';

export const useReproductionRequests = () => {
  const [requests, setRequests] = useState<ReproductionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reproduction_requests')
        .select(`
          *,
          producer:producers!reproduction_requests_producer_id_fkey(
            id,
            user_id,
            business_name,
            rating,
            profile:profiles!producers_user_id_fkey(
              full_name,
              username
            )
          ),
          song:songs!reproduction_requests_track_id_fkey(
            id,
            title,
            audio_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching reproduction requests:', err);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: {
    producer_id: string;
    track_id?: string;
    uploaded_track_url?: string;
    user_vocal_recording_url: string;
    track_title: string;
    special_instructions?: string;
    price_credits: number;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct credits and hold in escrow
      await updateUserCredits(user.id, -requestData.price_credits);

      const { error } = await supabase
        .from('reproduction_requests')
        .insert({
          user_id: user.id,
          escrow_held: true,
          ...requestData
        });

      if (error) {
        // Refund credits on error
        await updateUserCredits(user.id, requestData.price_credits);
        throw error;
      }

      toast.success('Reproduction request submitted successfully!');
      await fetchRequests();
      return true;
    } catch (err: any) {
      console.error('Error creating reproduction request:', err);
      toast.error(err.message || 'Failed to create request');
      return false;
    }
  };

  const updateRequestStatus = async (requestId: string, status: ReproductionRequest['status'], notes?: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      if (notes) {
        updateData.revision_notes = notes;
      }

      const { error } = await supabase
        .from('reproduction_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request status updated successfully!');
      await fetchRequests();
      return true;
    } catch (err: any) {
      console.error('Error updating request status:', err);
      toast.error(err.message || 'Failed to update status');
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    createRequest,
    updateRequestStatus,
    refetch: fetchRequests
  };
};
