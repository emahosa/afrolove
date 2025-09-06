import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, 
  Music, 
  Library, 
  Trophy, 
  User, 
  CreditCard, 
  HelpCircle,
  Lock
} from "lucide-react";

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

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isSubscriber } = useAuth();

  const isUserSubscribed = isSubscriber();
  const isUserAdmin = isAdmin();

  const roleFilteredNavItems = navItems.filter(item => !item.adminOnly || isUserAdmin);

  return (
    <div className="h-full p-4">
      <aside className="glass-surface h-full w-full flex flex-col !p-4">
        <div className="flex items-center h-16 px-4 flex-shrink-0">
          <Music className="h-6 w-6 text-white mr-2" />
          <p className="font-sans font-bold text-xl text-white">Afroverse</p>
        </div>
        <ScrollArea className="flex-1 px-2 py-4">
          <div className="flex flex-col space-y-2">
            {roleFilteredNavItems.map(item => {
              const needsSubscription = item.isProtected && !isUserAdmin && !isUserSubscribed;
              const isActive = item.href === location.pathname || (item.paths && item.paths.includes(location.pathname));

              return (
                <button
                  key={item.href}
                  className={cn(
                    "glass-btn w-full justify-start text-left !rounded-lg",
                    isActive && "bg-white/20"
                  )}
                  onClick={() => {
                    if (needsSubscription) navigate("/billing");
                    else navigate(item.href);
                  }}
                  title={needsSubscription ? `${item.label} (Subscription required)` : item.label}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-grow truncate">{item.label}</span>
                  {needsSubscription && (
                    <Lock className="ml-2 h-3 w-3 text-white/70 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
        {user && (
          <div className="mt-auto pt-4 border-t border-white/10 flex-shrink-0">
             <button className="glass-btn w-full justify-start text-left !rounded-lg" onClick={() => navigate('/profile')}>
               <User className="mr-3 h-5 w-5 flex-shrink-0" />
               <span className="truncate">{user.email?.split('@')[0] || user.id}</span>
             </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Sidebar;
