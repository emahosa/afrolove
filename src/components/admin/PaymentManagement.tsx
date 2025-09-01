
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentGatewayManagement from './PaymentGatewayManagement';

const PaymentManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">
          Manage payment gateways and transaction settings
        </p>
      </div>

      <Tabs defaultValue="gateways" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways">
          <PaymentGatewayManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentManagement;
