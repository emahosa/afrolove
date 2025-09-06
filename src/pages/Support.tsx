import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupportRequestForm } from '@/components/support/SupportRequestForm';
import { UserSupportTickets } from '@/components/support/UserSupportTickets';
import { Card } from '@/components/ui/card';

const SupportPage = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Support</h1>
        <p className="text-white/70 mt-2">Get help with any issues or questions you have.</p>
      </div>
      
      <Tabs defaultValue="new-request">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-request">New Request</TabsTrigger>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="new-request">
            <Card className="glass-surface !p-6">
              <SupportRequestForm />
            </Card>
          </TabsContent>

          <TabsContent value="my-tickets">
            <Card className="glass-surface !p-6">
              <UserSupportTickets />
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SupportPage;
