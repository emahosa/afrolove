import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Music,
  Library,
  Trophy,
  CreditCard,
  User,
  Settings,
  HelpCircle,
  Users,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const location = useLocation();
  const { isSubscriber, isAffiliate, isAdmin, isSuperAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Create Music', href: '/create', icon: Music },
    { name: 'Library', href: '/library', icon: Library },
    { name: 'Contest', href: '/contest', icon: Trophy },
    { name: 'Credits', href: '/credits', icon: CreditCard },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Support', href: '/support', icon: HelpCircle },
  ];

  if (isAffiliate()) {
    navigation.splice(6, 0, { name: 'Affiliate', href: '/affiliate-dashboard', icon: Briefcase });
  }

  if (isAdmin() || isSuperAdmin()) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Users });
  }

  return (
    <div className="flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-background border-r">
      <div className="flex-shrink-0 p-4">
        <Link to="/" className="font-semibold text-lg">
          SongCraft AI
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-2 pb-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SongCraft AI
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
