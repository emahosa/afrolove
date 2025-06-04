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
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Your Support Tickets</h3>
      
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No support tickets found</p>
          </CardContent>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenTicket(ticket)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{ticket.subject}</h4>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusIcon(ticket.status)}
                    <span className="ml-1">{ticket.status}</span>
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {ticket.message}
              </p>
              <p className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(ticket.created_at))} ago
              </p>
            </CardContent>
          </Card>
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
                    ? 'bg-primary/10 ml-8'
                    : 'bg-muted/50 mr-8'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">
                    {message.sender_type === 'admin' ? 'Support Agent' : 'You'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at))} ago
                  </span>
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ))}
          </div>
          
          {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Reply</label>
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
