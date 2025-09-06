import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Music, 
  Library, 
  Trophy, 
  User, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  Lock
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isProtected?: boolean;
  paths?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, paths: ["/"] },
  { href: "/create", label: "Create", icon: Music, isProtected: true },
  { href: "/library", label: "Library", icon: Library, isProtected: true },
  { href: "/contest", label: "Contest", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/billing", label: "Billing", icon: CreditCard, paths: ["/subscribe"] },
  { href: "/support", label: "Support", icon: HelpCircle, isProtected: true },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isSubscriber } = useAuth();

  const isUserSubscribed = isSubscriber();
  const isUserAdmin = isAdmin();

  // Filter items - completely hide admin items for non-admins
  const roleFilteredNavItems = navItems.filter(item => {
    // This assumes an `adminOnly` property on the nav item type
    // @ts-ignore
    if (item.adminOnly && !isUserAdmin) return false;
    return true;
  });

  return (
    <aside className="h-full w-64 flex flex-col glass-surface p-4">
      <div className="flex items-center h-16 px-4 -mx-4 flex-shrink-0 border-b border-white/10 mb-4">
        <p className="font-sans font-bold text-xl text-white">Afroverse</p>
      </div>
      <ScrollArea className="flex-1 -mx-4">
        <div className="flex flex-col space-y-2 px-4">
          {roleFilteredNavItems.map(item => {
            const needsSubscription = item.isProtected && !isUserAdmin && !isUserSubscribed;
            const isActive = item.href === location.pathname || (item.paths && item.paths.includes(location.pathname));

            return (
              <Button
                key={item.href}
                className={cn(
                  "w-full justify-start !py-2 !px-3 text-sm", // Compact style
                  isActive && "active" // Active class for styling
                )}
                onClick={() => {
                  if (needsSubscription) {
                    navigate("/billing");
                  } else {
                    navigate(item.href);
                  }
                }}
                title={needsSubscription ? `${item.label} (Subscription required)` : item.label}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="flex-grow text-left truncate">{item.label}</span>
                {needsSubscription && (
                  <Lock className="ml-2 h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
      {user && (
        <div className="mt-auto flex flex-col space-y-2 pt-4 border-t border-white/10 -mx-4 px-4">
           <Button className="w-full justify-start !py-2 !px-3 text-sm" onClick={() => navigate('/profile')}>
             <User className="mr-3 h-5 w-5 flex-shrink-0" />
             <span className="truncate">{user.email?.split('@')[0] || 'Profile'}</span>
           </Button>
           <Button className="w-full justify-start !py-2 !px-3 text-sm" onClick={logout}>
             <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
             <span>Logout</span>
           </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
