
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/admin/UserManagement';
import ApiKeyManagement from '@/components/admin/ApiKeyManagement';
import GenreManagement from '@/components/admin/GenreManagement';
import { ContestManagement } from '@/components/admin/ContestManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import SiteSettingsManagement from '@/components/admin/SiteSettingsManagement';

const Admin = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="api-keys">
          <ApiKeyManagement />
        </TabsContent>
        
        <TabsContent value="genres">
          <GenreManagement />
        </TabsContent>
        
        <TabsContent value="contests">
          <ContestManagement />
        </TabsContent>
        
        <TabsContent value="payments">
          <PaymentManagement />
        </TabsContent>

        <TabsContent value="settings">
          <SiteSettingsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
