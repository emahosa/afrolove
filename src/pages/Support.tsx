
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportRequestForm } from '@/components/support/SupportRequestForm';
import { UserSupportTickets } from '@/components/support/UserSupportTickets';

const Support = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Customer Support</h1>
        <p className="text-gray-400">Get help with any issues or questions you have</p>
      </div>
      
      <Tabs defaultValue="new-request" className="text-white">
        <TabsList className="bg-black/30 border border-white/10">
          <TabsTrigger value="new-request" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">New Request</TabsTrigger>
          <TabsTrigger value="my-tickets" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">My Tickets</TabsTrigger>
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
