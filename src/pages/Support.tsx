
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportRequestForm } from '@/components/support/SupportRequestForm';
import { UserSupportTickets } from '@/components/support/UserSupportTickets';

const Support = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Support</h1>
        <p className="text-muted-foreground">Get help with any issues or questions you have</p>
      </div>
      
      <Tabs defaultValue="new-request">
        <TabsList>
          <TabsTrigger value="new-request">New Request</TabsTrigger>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-request" className="mt-6">
          <SupportRequestForm />
        </TabsContent>
        
        <TabsContent value="my-tickets" className="mt-6">
          <UserSupportTickets />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Support;
