
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminManagement from '@/components/admin/AdminManagement';
import UserManagement from '@/components/admin/UserManagement';
import ContestManagement from '@/components/admin/ContestManagement';
import ContentManagement from '@/components/admin/ContentManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import ReportsAnalytics from '@/components/admin/ReportsAnalytics';
import SupportManagement from '@/components/admin/SupportManagement';
import SettingsManagement from '@/components/admin/SettingsManagement';
import GenreManagement from '@/components/admin/GenreManagement';
import GenreTemplateManagement from '@/components/admin/GenreTemplateManagement';
import ApiKeyManagement from '@/components/admin/ApiKeyManagement';
import { AffiliateManagementTab } from '@/components/admin/affiliate/AffiliateManagementTab';
import { Shield, Users, Trophy, FileText, CreditCard, BarChart3, HelpCircle, Settings, Music } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users, component: UserManagement },
    { id: 'admin', label: 'Admin Management', icon: Shield, component: AdminManagement },
    { id: 'contests', label: 'Contests', icon: Trophy, component: ContestManagement },
    { id: 'content', label: 'Content', icon: FileText, component: ContentManagement },
    { id: 'payments', label: 'Payments', icon: CreditCard, component: PaymentManagement },
    { id: 'reports', label: 'Reports', icon: BarChart3, component: ReportsAnalytics },
    { id: 'support', label: 'Support', icon: HelpCircle, component: SupportManagement },
    { id: 'genres', label: 'Genres', icon: Music, component: GenreManagement },
    { id: 'templates', label: 'Templates', icon: Music, component: GenreTemplateManagement },
    { id: 'api-keys', label: 'API Keys', icon: Settings, component: ApiKeyManagement },
    { id: 'affiliates', label: 'Affiliates', icon: Users, component: AffiliateManagementTab },
    { id: 'settings', label: 'Settings', icon: Settings, component: SettingsManagement },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your application settings and users</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex flex-col items-center gap-1 p-3 text-xs"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => {
            const Component = tab.component;
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <Component />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
