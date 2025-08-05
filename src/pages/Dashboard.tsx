
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Library, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Create Music',
      icon: Music,
      description: 'Generate new songs with AI',
      href: '/create',
      color: 'bg-violet-600 hover:bg-violet-700'
    },
    {
      title: 'My Library',
      icon: Library,
      description: 'View your created songs',
      href: '/library',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Contest',
      icon: Trophy,
      description: 'Join music competitions',
      href: '/contest',
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      title: 'Affiliate',
      icon: Users,
      description: 'Earn by referring users',
      href: '/affiliate-dashboard',
      color: 'bg-green-600 hover:bg-green-700'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back, {user?.user_metadata?.full_name || user?.email || 'Creator'}
          </h1>
          <p className="text-gray-400 text-lg">What would you like to create today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-200 h-full">
                <CardContent className="p-6 text-center">
                  <action.icon className="h-12 w-12 mx-auto mb-4 text-white" />
                  <h3 className="text-xl font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{action.description}</p>
                  <Button className={`w-full ${action.color}`}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
