import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { MessageSquare, Check, Clock } from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  user: string;
  status: 'new' | 'active' | 'pending' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  last_updated: string;
  messages?: {
    sender: string;
    content: string;
    timestamp: string;
  }[];
}

const mockTickets: SupportTicket[] = [
  {
    id: "T-1001",
    subject: "Can't generate music",
    user: "john@example.com",
    status: "new",
    priority: "high",
    created_at: "2025-04-27 09:15",
    last_updated: "2025-04-27 09:15",
    messages: [
      {
        sender: "john@example.com",
        content: "I'm trying to generate music but keep getting an error message. Can you help?",
        timestamp: "2025-04-27 09:15"
      }
    ]
  },
  {
    id: "T-1002",
    subject: "Billing issue with my subscription",
    user: "sarah@example.com",
    status: "active",
    priority: "medium",
    created_at: "2025-04-26 14:22",
    last_updated: "2025-04-27 11:05",
    messages: [
      {
        sender: "sarah@example.com",
        content: "I was charged twice for my monthly subscription. Please help resolve this issue.",
        timestamp: "2025-04-26 14:22"
      },
      {
        sender: "admin",
        content: "I'm checking with our billing department and will get back to you shortly.",
        timestamp: "2025-04-27 11:05"
      }
    ]
  },
  {
    id: "T-1003",
    subject: "Voice cloning not working",
    user: "robert@example.com",
    status: "pending",
    priority: "medium",
    created_at: "2025-04-25 16:30",
    last_updated: "2025-04-27 10:15",
    messages: [
      {
        sender: "robert@example.com",
        content: "I uploaded my voice sample but the cloning process seems to be stuck.",
        timestamp: "2025-04-25 16:30"
      },
      {
        sender: "admin",
        content: "Can you please provide the exact error message you're seeing?",
        timestamp: "2025-04-26 09:45"
      },
      {
        sender: "admin",
        content: "Just following up on this issue. Have you had a chance to check the error message?",
        timestamp: "2025-04-27 10:15"
      }
    ]
  },
  {
    id: "T-1004",
    subject: "How to split vocals and instrumental",
    user: "emma@example.com",
    status: "completed",
    priority: "low",
    created_at: "2025-04-24 11:20",
    last_updated: "2025-04-26 15:40",
    messages: [
      {
        sender: "emma@example.com",
        content: "Is there a way to split the vocals from the instrumental in my generated songs?",
        timestamp: "2025-04-24 11:20"
      },
      {
        sender: "admin",
        content: "Yes, you can use our Split Audio feature. Go to your song list, select the track, and click the 'Split Audio' button.",
        timestamp: "2025-04-24 13:15"
      },
      {
        sender: "emma@example.com",
        content: "Thank you! I found it and it works perfectly.",
        timestamp: "2025-04-25 10:05"
      },
      {
        sender: "admin",
        content: "Great! Let us know if you need anything else.",
        timestamp: "2025-04-26 15:40"
      }
    ]
  },
  {
    id: "T-1005",
    subject: "Missing credits after payment",
    user: "david@example.com",
    status: "closed",
    priority: "high",
    created_at: "2025-04-23 08:50",
    last_updated: "2025-04-24 14:30",
    messages: [
      {
        sender: "david@example.com",
        content: "I purchased 50 credits but they haven't been added to my account yet.",
        timestamp: "2025-04-23 08:50"
      },
      {
        sender: "admin",
        content: "I'll check with our payment processor right away.",
        timestamp: "2025-04-23 09:25"
      },
      {
        sender: "admin",
        content: "We've identified the issue and your credits have been added to your account. Please confirm.",
        timestamp: "2025-04-23 14:10"
      },
      {
        sender: "david@example.com",
        content: "I can see the credits now. Thank you for your help!",
        timestamp: "2025-04-24 14:30"
      }
    ]
  }
];

export const SupportManagement = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  const getFilteredTickets = (status: SupportTicket['status']) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsTicketDialogOpen(true);
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyText.trim()) return;

    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === selectedTicket.id) {
        const messages = [
          ...(ticket.messages || []),
          {
            sender: "admin",
            content: replyText,
            timestamp: new Date().toLocaleString()
          }
        ];
        
        return {
          ...ticket,
          status: 'pending' as const,
          last_updated: new Date().toLocaleString(),
          messages
        };
      }
      return ticket;
    });
    
    setTickets(updatedTickets);
    setReplyText('');
    toast.success("Reply sent to user");
  };

  const handleUpdateStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === ticketId) {
        return {
          ...ticket,
          status: newStatus,
          last_updated: new Date().toLocaleString()
        };
      }
      return ticket;
    });
    
    setTickets(updatedTickets);
    setIsTicketDialogOpen(false);
    
    const statusMessages = {
      active: "Ticket marked as active",
      pending: "Ticket marked as pending user response",
      completed: "Ticket marked as completed",
      closed: "Ticket closed"
    };
    
    toast.success(statusMessages[newStatus] || "Ticket status updated");
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
              <TableCell>{ticket.id}</TableCell>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{ticket.user}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  ticket.priority === 'high' ? 'bg-red-100 text-red-800' : 
                  ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {ticket.priority}
                </span>
              </TableCell>
              <TableCell>{ticket.created_at}</TableCell>
              <TableCell>{ticket.last_updated}</TableCell>
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
              Ticket #{selectedTicket?.id}: {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              {selectedTicket?.user} - {selectedTicket?.created_at}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto py-4">
            {selectedTicket?.messages?.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.sender === 'admin'
                    ? 'bg-primary/10 ml-8'
                    : 'bg-muted/50 mr-8'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">
                    {message.sender === 'admin' ? 'Support Agent' : message.sender}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp}
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
                <textarea
                  className="w-full mt-1 border rounded-md p-2 h-24"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response here..."
                ></textarea>
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
                disabled={!replyText.trim()}
                onClick={handleSendReply}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Reply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
