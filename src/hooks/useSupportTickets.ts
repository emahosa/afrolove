import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('support_tickets')
        .select('*');

      if (!isAdmin()) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails for admin view
      if (isAdmin() && data && data.length > 0) {
        const userIds = [...new Set(data.map(ticket => ticket.user_id))];
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (!userError && userData) {
          const userMap = new Map(userData.map(u => [u.id, u.username]));
          const ticketsWithEmail = data.map(ticket => ({
            ...ticket,
            status: ticket.status as SupportTicket['status'],
            priority: ticket.priority as SupportTicket['priority'],
            user_email: userMap.get(ticket.user_id) || 'Unknown user'
          }));
          setTickets(ticketsWithEmail);
        } else {
          setTickets(data.map(ticket => ({ 
            ...ticket, 
            status: ticket.status as SupportTicket['status'],
            priority: ticket.priority as SupportTicket['priority'],
            user_email: 'Unknown user' 
          })));
        }
      } else {
        setTickets((data || []).map(ticket => ({
          ...ticket,
          status: ticket.status as SupportTicket['status'],
          priority: ticket.priority as SupportTicket['priority']
        })));
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(prev => ({
        ...prev,
        [ticketId]: (data || []).map(msg => ({
          ...msg,
          sender_type: msg.sender_type as SupportMessage['sender_type']
        }))
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  };

  const createTicket = async (ticketData: { subject: string; message: string; priority: SupportTicket['priority'] }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: user.id,
          subject: ticketData.subject,
          message: ticketData.message,
          priority: ticketData.priority,
          status: 'new' as const
        }])
        .select()
        .single();

      if (error) throw error;

      const newTicket = {
        ...data,
        status: data.status as SupportTicket['status'],
        priority: data.priority as SupportTicket['priority']
      };

      setTickets(prev => [newTicket, ...prev]);
      toast.success('Support ticket created successfully');
      return newTicket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
      return null;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;

      const updatedTicket = {
        ...data,
        status: data.status as SupportTicket['status'],
        priority: data.priority as SupportTicket['priority']
      };

      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? updatedTicket : ticket
      ));
      toast.success('Ticket updated successfully');
      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
      return null;
    }
  };

  const createMessage = async (ticketId: string, content: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: isAdmin() ? 'admin' as const : 'user' as const,
          content
        }])
        .select()
        .single();

      if (error) throw error;

      const newMessage = {
        ...data,
        sender_type: data.sender_type as SupportMessage['sender_type']
      };

      setMessages(prev => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] || []), newMessage]
      }));

      // Update ticket status to active if it's new
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status === 'new') {
        await updateTicket(ticketId, { status: 'active' });
      }

      toast.success('Message sent successfully');
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      toast.error('Failed to send message');
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  return {
    tickets,
    messages,
    loading,
    createTicket,
    updateTicket,
    createMessage,
    fetchMessages,
    refetch: fetchTickets
  };
};
