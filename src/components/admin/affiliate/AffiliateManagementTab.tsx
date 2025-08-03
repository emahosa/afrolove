
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AffiliateSettings from '../AffiliateSettings';

const AffiliateManagementTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Affiliate Management</h2>
        <p className="text-muted-foreground">
          Manage affiliate programs, settings, and performance analytics.
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Program Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Stats</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates List</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          <AffiliateSettings />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="affiliates" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Affiliates list coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Applications management coming soon...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="payouts" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Payout management coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateManagementTab;
