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
  Award,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  isProtected?: boolean;
  tag?: string;
  paths?: string[];
  condition?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isSubscriber, isWinner } = useAuth();

  const isUserSubscribed = isSubscriber();
  const isUserAdmin = isAdmin();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: Home, paths: ["/"] },
    { href: "/create", label: "Create", icon: Music, isProtected: true },
    { href: "/library", label: "Library", icon: Library, isProtected: true },
    { href: "/contest", label: "Contest", icon: Trophy },
    { href: "/winner-status", label: "Winner Status", icon: Award, condition: isWinner },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/billing", label: "Billing", icon: CreditCard, paths: ["/subscribe"] },
    { href: "/support", label: "Support", icon: HelpCircle, isProtected: true },
  ];

  // Filter items based on conditions
  const roleFilteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isUserAdmin) return false;
    if (item.condition === false) return false;
    return true;
  });

  return (
    <aside className={cn("h-full w-24 flex flex-col", className)}>
      <div className="flex items-center justify-center h-16 px-4 border-b border-white/10 flex-shrink-0">
        {/* Logo and title can be placed here */}
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="flex flex-col space-y-1">
          {roleFilteredNavItems.map(item => {
            const needsSubscription = item.isProtected && !isUserAdmin && !isUserSubscribed;
            const isActive = item.href === location.pathname || (item.paths && item.paths.includes(location.pathname));

            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full h-auto flex-col justify-center items-center text-gray-300 hover:bg-white/10 hover:text-white relative py-2",
                  isActive && "font-semibold bg-dark-purple text-white hover:bg-dark-purple/90"
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
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-white")} />
                <span className="text-xs mt-1 text-center break-words">{item.label}</span>
                {item.tag && !needsSubscription && (
                  <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0.5 self-center border-dark-purple text-dark-purple">
                    {item.tag}
                  </Badge>
                )}
                {needsSubscription && (
                  <Lock className="absolute top-1 right-1 h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
      {user && (
        <div className="mt-auto p-2 border-t border-white/10 flex-shrink-0">
           <Button variant="ghost" className="w-full h-auto flex-col justify-center items-center text-gray-300 hover:bg-white/10 hover:text-white py-2" onClick={() => navigate('/profile')}>
             <User className="h-5 w-5 flex-shrink-0" />
             <span className="text-xs mt-1 truncate">{user.email?.split('@')[0] || user.id}</span>
           </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
