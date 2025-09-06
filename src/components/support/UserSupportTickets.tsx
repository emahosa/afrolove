import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';

export const UserSupportTickets = () => {
  const { tickets, messages, loading, fetchMessages, createMessage } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <MessageSquare className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dark-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      <h3 className="text-lg font-semibold">Your Support Tickets</h3>
      
      {tickets.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No support tickets found</p>
          </CardContent>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 transition-colors" onClick={() => handleOpenTicket(ticket)}>
            <CardContent className="p-4">
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
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                {ticket.message}
              </p>
              <p className="text-xs text-gray-500">
                Created {formatDistanceToNow(new Date(ticket.created_at))} ago
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl bg-gray-900 border-white/10 text-white">
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
                    ? 'bg-dark-purple/20 ml-8'
                    : 'bg-white/5 mr-8'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-white">
                    {message.sender_type === 'admin' ? 'Support Agent' : 'You'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(message.created_at))} ago
                  </span>
                </div>
                <div className="text-sm text-gray-300">{message.content}</div>
              </div>
            ))}
          </div>
          
          {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Reply</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response here..."
                  rows={3}
                  className="bg-black/20 border-white/20 text-white placeholder-gray-500"
                />
              </div>
              <Button 
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSending}
                className="bg-dark-purple hover:bg-opacity-90 font-bold"
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
