import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportRequestForm } from '@/components/support/SupportRequestForm';
import { UserSupportTickets } from '@/components/support/UserSupportTickets';
import Layout from '@/components/Layout';

const Support = () => {
  return (
    <Layout active="Support">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Customer Support</h1>
        <p className="text-gray-400">Get help with any issues or questions you have</p>
      </div>
      
      <Tabs defaultValue="new-request" className="text-white">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10 rounded-xl">
          <TabsTrigger value="new-request" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white rounded-lg">New Request</TabsTrigger>
          <TabsTrigger value="my-tickets" className="data-[state=active]:bg-purple-600/40 data-[state=active]:text-white rounded-lg">My Tickets</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="new-request">
            <div className="glass-card p-6 rounded-2xl">
              <SupportRequestForm />
            </div>
          </TabsContent>

          <TabsContent value="my-tickets">
            <div className="glass-card p-6 rounded-2xl">
              <UserSupportTickets />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Layout>
  );
};

export default Support;
