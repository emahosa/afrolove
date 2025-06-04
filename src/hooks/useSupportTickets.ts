
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'new' | 'active' | 'pending' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: 'user' | 'admin';
  content: string;
  created_at: string;
}

export const useSupportTickets = () => {
  const { user, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<{ [ticketId: string]: SupportMessage[] }>({});
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!inner(username)
        `);

      if (!isAdmin()) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const ticketsWithEmail = data?.map(ticket => ({
        ...ticket,
        user_email: ticket.profiles?.username || 'Unknown user'
      })) || [];

      setTickets(ticketsWithEmail);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(prev => ({
        ...prev,
        [ticketId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  }, []);

  const createTicket = async (subject: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          message,
          priority
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial message
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: data.id,
          sender_id: user.id,
          sender_type: 'user',
          content: message
        });

      toast.success('Support ticket created successfully');
      fetchTickets();
      return data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
      throw error;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Ticket status updated to ${status}`);
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const sendMessage = async (ticketId: string, content: string) => {
    if (!user) return;

    try {
      const senderType = isAdmin() ? 'admin' : 'user';
      
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: senderType,
          content
        });

      if (error) throw error;

      // Update ticket status to pending if admin replied
      if (senderType === 'admin') {
        await updateTicketStatus(ticketId, 'pending');
      }

      toast.success('Message sent successfully');
      fetchMessages(ticketId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    messages,
    loading,
    fetchTickets,
    fetchMessages,
    createTicket,
    updateTicketStatus,
    sendMessage
  };
};
