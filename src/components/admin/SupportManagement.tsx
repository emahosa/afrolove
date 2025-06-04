
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageSquare, Check, Clock } from 'lucide-react';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

export const SupportManagement = () => {
  const { tickets, messages, loading, fetchMessages, updateTicketStatus, sendMessage } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getFilteredTickets = (status: SupportTicket['status']) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketDialogOpen(true);
    await fetchMessages(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      await sendMessage(selectedTicket.id, replyText);
      setReplyText('');
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: SupportTicket['status']) => {
    await updateTicketStatus(ticketId, newStatus);
    setIsTicketDialogOpen(false);
  };

  const renderTicketTable = (filteredTickets: SupportTicket[]) => {
    if (filteredTickets.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No tickets in this category.
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>#{ticket.id.slice(-8)}</TableCell>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{ticket.user_email}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  ticket.priority === 'high' ? 'bg-red-100 text-red-800' : 
                  ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {ticket.priority}
                </span>
              </TableCell>
              <TableCell>{formatDistanceToNow(new Date(ticket.created_at))} ago</TableCell>
              <TableCell>{formatDistanceToNow(new Date(ticket.updated_at))} ago</TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleOpenTicket(ticket)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Support</h2>
      
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">
            New Requests
            {getFilteredTickets('new').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {getFilteredTickets('new').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Requests
            {getFilteredTickets('active').length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {getFilteredTickets('active').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Requests
            {getFilteredTickets('pending').length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                {getFilteredTickets('pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed Requests</TabsTrigger>
          <TabsTrigger value="closed">Closed Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>New Support Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTicketTable(getFilteredTickets('new'))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Support Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTicketTable(getFilteredTickets('active'))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending User Response</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTicketTable(getFilteredTickets('pending'))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTicketTable(getFilteredTickets('completed'))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="closed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Closed Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTicketTable(getFilteredTickets('closed'))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* View Ticket Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Ticket #{selectedTicket?.id.slice(-8)}: {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket?.user_email} - {selectedTicket && formatDistanceToNow(new Date(selectedTicket.created_at))} ago
            </DialogDescription>
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
                    {message.sender_type === 'admin' ? 'Support Agent' : selectedTicket.user_email}
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
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex gap-2">
              {selectedTicket?.status !== 'active' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTicket?.id || '', 'active')}
                >
                  Mark Active
                </Button>
              )}
              {selectedTicket?.status !== 'completed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTicket?.id || '', 'completed')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              {selectedTicket?.status !== 'closed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedTicket?.id || '', 'closed')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
              )}
            </div>
            
            {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'completed' && (
              <Button 
                disabled={!replyText.trim() || isSending}
                onClick={handleSendReply}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Reply'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
