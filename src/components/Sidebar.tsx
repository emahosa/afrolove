
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
  Menu,
  Folder,
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

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isSubscriber } = useAuth();

  const isUserSubscribed = isSubscriber();
  const isUserAdmin = isAdmin();

  // Filter items - completely hide admin items for non-admins
  const roleFilteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isUserAdmin) return false;
    return true;
  });

  return (
    <aside className={cn("h-full w-60 flex flex-col", className)}>
      <h1 className="text-purple-400 font-bold text-2xl mb-8 p-4">🎵 Afroverse</h1>
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="flex flex-col space-y-4">
          {roleFilteredNavItems.map(item => {
            const needsSubscription = item.isProtected && !isUserAdmin && !isUserSubscribed;
            const effectiveLabel = item.label === "Credits & Plans" && isUserSubscribed ? "Manage Plan" : item.label;
            const isActive = item.href === location.pathname || (item.paths && item.paths.includes(location.pathname));

            return (
              <button
                key={item.href}
                className={cn(
                  "flex items-center text-gray-300 hover:text-purple-400 transition-all duration-300 ease-in-out transform hover:scale-105",
                  isActive && "font-semibold text-purple-400"
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
                <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive && "text-purple-400")} />
                <span className="flex-grow text-left truncate">{effectiveLabel}</span>
                {item.tag && !needsSubscription && (
                  <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0.5 self-center border-dark-purple text-dark-purple">
                    {item.tag}
                  </Badge>
                )}
                {needsSubscription && (
                  <Lock className="ml-2 h-3 w-3 text-gray-400 flex-shrink-0 self-center" />
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
      {user && (
        <div className="mt-auto p-2 border-t border-purple-700/30 flex-shrink-0">
           <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-purple-400" onClick={() => navigate('/profile')}>
             <User className="mr-3 h-5 w-5 flex-shrink-0" />
             <span className="truncate">{user.email?.split('@')[0] || user.id}</span>
           </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
