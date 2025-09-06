import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { GlassCard } from '@/components/ui/GlassCard';

export const UserSupportTickets = () => {
  const { tickets, messages, loading, fetchMessages, createMessage } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4" />;
      case 'active': return <MessageSquare className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-white/15 text-white border-white/20';
      case 'active': return 'bg-white/20 text-white border-white/30';
      case 'pending': return 'bg-white/10 text-white/80 border-white/15';
      case 'completed': return 'bg-white/5 text-white/70 border-white/10';
      case 'closed': return 'bg-black/20 text-white/50 border-white/5';
      default: return 'bg-black/20 text-white/50 border-white/5';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-white/40 text-white font-bold';
      case 'medium': return 'border-white/20 text-white/80';
      case 'low': return 'border-white/10 text-white/60';
      default: return 'border-white/10 text-white/60';
    }
  };

  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDialogOpen(true);
    await fetchMessages(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      await createMessage(selectedTicket.id, replyText);
      setReplyText('');
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/50"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      <h3 className="text-lg font-semibold">Your Support Tickets</h3>
      
      {tickets.length === 0 ? (
        <div className="glass-surface text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-white/50 mb-4" />
          <p className="text-white/70">No support tickets found</p>
        </div>
      ) : (
        tickets.map((ticket) => (
          <GlassCard key={ticket.id} onClick={() => handleOpenTicket(ticket)}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white">{ticket.subject}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(ticket.status)}>
                    {getStatusIcon(ticket.status)}
                    <span className="ml-1">{ticket.status}</span>
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-white/70 mb-2 line-clamp-2">
                {ticket.message}
              </p>
              <p className="text-xs text-white/50">
                Created {formatDistanceToNow(new Date(ticket.created_at))} ago
              </p>
            </div>
          </GlassCard>
        ))
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Ticket #{selectedTicket?.id.slice(-8)}: {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto py-4">
            {selectedTicket && messages[selectedTicket.id]?.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.sender_type === 'admin'
                    ? 'bg-white/10 ml-8'
                    : 'bg-black/20 mr-8'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-white">
                    {message.sender_type === 'admin' ? 'Support Agent' : 'You'}
                  </span>
                  <span className="text-xs text-white/70">
                    {formatDistanceToNow(new Date(message.created_at))} ago
                  </span>
                </div>
                <div className="text-sm text-white/80">{message.content}</div>
              </div>
            ))}
          </div>
          
          {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <label className="text-sm font-medium text-white/80 mb-1 block">Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response here..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
              >
                {isSending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
