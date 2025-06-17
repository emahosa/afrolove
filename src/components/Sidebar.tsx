
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Home, 
  Plus, 
  Music, 
  Coins, 
  Trophy, 
  User, 
  HelpCircle, 
  Settings,
  X,
  Users,
  Briefcase
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();
  const { isAdmin, isSuperAdmin, isAffiliate, canAccessFeature } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, feature: 'dashboard' },
    { name: 'Create Music', href: '/create', icon: Plus, feature: 'create' },
    { name: 'Library', href: '/library', icon: Music, feature: 'library' },
    { name: 'Credits', href: '/credits', icon: Coins, feature: 'credits' },
    { name: 'Contest', href: '/contest', icon: Trophy, feature: 'contest' },
    { name: 'Profile', href: '/profile', icon: User, feature: 'profile' },
    { name: 'Support', href: '/support', icon: HelpCircle, feature: 'support' },
  ];

  // Add affiliate navigation if user is an affiliate
  if (isAffiliate()) {
    navigation.splice(-2, 0, { 
      name: 'Affiliate', 
      href: '/affiliate', 
      icon: Briefcase, 
      feature: 'affiliate' 
    });
  }

  // Add admin navigation if user is admin
  if (isAdmin() || isSuperAdmin()) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Settings, feature: 'admin' });
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Music className="h-6 w-6 text-melody-primary" />
          <span className="font-bold text-melody-primary">Afroverse</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {navigation.map((item) => {
            // Check if user can access this feature
            const hasAccess = canAccessFeature(item.feature);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                  location.pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                  !hasAccess && 'opacity-50 cursor-not-allowed'
                )}
                onClick={(e) => {
                  if (!hasAccess) {
                    e.preventDefault();
                    return false;
                  }
                  setOpen(false);
                }}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
                {!hasAccess && (
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Locked
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Sidebar;
