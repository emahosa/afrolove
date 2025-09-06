import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { Label } from '@/components/ui/label';

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
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div></div>;
  }

  return (
    <div className="space-y-4">
      <CardTitle>My Tickets</CardTitle>
      <CardDescription>View the status of your support tickets.</CardDescription>
      
      {tickets.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-white/70 mb-4" />
          <p className="text-white/70">No support tickets found</p>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleOpenTicket(ticket)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{ticket.subject}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">{ticket.priority}</Badge>
                  <Badge variant="secondary" className="flex items-center gap-1.5">{getStatusIcon(ticket.status)} {ticket.status}</Badge>
                </div>
              </div>
              <p className="text-sm text-white/70 mb-2 line-clamp-2">{ticket.message}</p>
              <p className="text-xs text-white/50">Created {formatDistanceToNow(new Date(ticket.created_at))} ago</p>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-surface max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ticket #{selectedTicket?.id.slice(-8)}: {selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto py-4">
            {selectedTicket && messages[selectedTicket.id]?.map((message) => (
              <div key={message.id} className={`p-4 rounded-lg ${message.sender_type === 'admin' ? 'bg-white/10 ml-8' : 'bg-white/5 mr-8'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{message.sender_type === 'admin' ? 'Support Agent' : 'You'}</span>
                  <span className="text-xs text-white/70">{formatDistanceToNow(new Date(message.created_at))} ago</span>
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ))}
          </div>
          {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="space-y-2">
                <Label htmlFor="reply">Reply</Label>
                <Textarea id="reply" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your response here..." rows={3} />
              </div>
              <Button onClick={handleSendReply} disabled={!replyText.trim() || isSending}>
                {isSending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
