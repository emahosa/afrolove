
import React from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/admin/UserManagement';
import { ApiKeyManagement } from '@/components/admin/ApiKeyManagement';
import { ContestManagement } from '@/components/admin/ContestManagement';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { GenreManagement } from '@/components/admin/GenreManagement';
import { ReportsAnalytics } from '@/components/admin/ReportsAnalytics';
import { SupportManagement } from '@/components/admin/SupportManagement';

const Admin = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="contests">Contests</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="genres">Genres</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="api-keys">
            <ApiKeyManagement />
          </TabsContent>
          
          <TabsContent value="contests">
            <ContestManagement />
          </TabsContent>
          
          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>
          
          <TabsContent value="genres">
            <GenreManagement />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportsAnalytics />
          </TabsContent>
          
          <TabsContent value="support">
            <SupportManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Admin;
