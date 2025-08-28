
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportRequestForm } from '@/components/support/SupportRequestForm';
import { UserSupportTickets } from '@/components/support/UserSupportTickets';

const Support = () => {
  return (
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="flex-shrink-0">
        <h1 className="text-3xl font-bold text-white">Customer Support</h1>
        <p className="text-gray-400">Get help with any issues or questions you have</p>
      </div>
      
      <Tabs defaultValue="new-request" className="text-white flex flex-col flex-grow mt-6">
        <TabsList className="bg-black/30 border border-white/10 flex-shrink-0">
          <TabsTrigger value="new-request" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">New Request</TabsTrigger>
          <TabsTrigger value="my-tickets" className="data-[state=active]:bg-dark-purple data-[state=active]:text-white">My Tickets</TabsTrigger>
        </TabsList>
        
        <div className="flex-grow mt-6 overflow-y-auto pr-4 pb-24">
          <TabsContent value="new-request">
            <SupportRequestForm />
          </TabsContent>

          <TabsContent value="my-tickets">
            <UserSupportTickets />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Support;
