import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Settings,
  Lock // Import Lock icon
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
  affiliateOnly?: boolean;
  isProtected?: boolean; // True if feature requires subscription (and user is not admin/affiliate)
  tag?: string; // Optional tag like "New" or "Beta"
  paths?: string[]; // Alternative paths that should highlight this item
}

// Note: `isProtected` means it needs a subscription if the user is not an admin or affiliate.
// Admins/Affiliates bypass the subscription check for protected routes by their nature.
const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, paths: ["/"] },
  { href: "/create", label: "Create", icon: Music, isProtected: true },
  { href: "/library", label: "Library", icon: Library, isProtected: true },
  { href: "/contest", label: "Contest", icon: Trophy }, // Contest is generally open
  { href: "/my-custom-songs", label: "My Custom Songs", icon: Music, isProtected: true, tag: "New" },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/credits", label: "Credits & Plans", icon: CreditCard, paths: ["/subscribe"] },
  { href: "/support", label: "Support", icon: HelpCircle, isProtected: true },
  { href: "/admin", label: "Admin Panel", icon: Settings, adminOnly: true },
  { href: "/affiliate", label: "Affiliate", icon: Folder, affiliateOnly: true },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [open, setOpen] = useState(false); // For mobile sheet
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, isAffiliate, isSubscriber } = useAuth();

  const isUserSubscribed = isSubscriber();
  const isUserAdmin = isAdmin();
  const isUserAffiliate = isAffiliate();

  // Filter items based on admin/affiliate roles first
  const roleFilteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isUserAdmin) return false;
    if (item.affiliateOnly && !isUserAffiliate) return false;
    return true;
  });

  const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
    // An item requires subscription if:
    // 1. It's marked as 'isProtected'.
    // 2. The user is NOT an admin (admins have access to everything).
    // 3. The user is NOT an affiliate (affiliates might have special access, though this could be refined).
    // 4. The user is NOT currently subscribed.
    const needsSubscription = item.isProtected && !isUserAdmin && !isUserAffiliate && !isUserSubscribed;

    const effectiveLabel = item.label === "Credits & Plans" && isUserSubscribed ? "Manage Plan" : item.label;
    const isActive = item.href === location.pathname || (item.paths && item.paths.includes(location.pathname));

    return (
      <Button
        key={item.href}
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start text-foreground hover:bg-muted hover:text-foreground relative", // Added relative for potential absolute positioned elements within
          isActive && "font-semibold"
        )}
        onClick={() => {
          if (needsSubscription) {
            navigate("/credits");
          } else {
            navigate(item.href);
          }
          if (isMobile) setOpen(false);
        }}
        title={needsSubscription ? `${item.label} (Subscription required)` : item.label}
      >
        <item.icon className={cn("mr-2 h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
        <span className="flex-grow text-left truncate">{effectiveLabel}</span> {/* Ensure text truncates */}
        {item.tag && !needsSubscription && (
          <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0.5 self-center">
            {item.tag}
          </Badge>
        )}
        {needsSubscription && (
          <Lock className="ml-2 h-3 w-3 text-muted-foreground flex-shrink-0 self-center" />
        )}
      </Button>
    );
  };

  const sidebarContent = (isMobile: boolean = false) => (
    <>
      <div className="mb-4 flex items-center h-16 px-4 border-b"> {/* Standardized header height and added border */}
        <img src="/favicon.ico" alt="MelodyVerse Logo" className="h-8 w-auto mr-2" /> {/* Placeholder logo */}
        <p className="font-semibold text-foreground text-lg">MelodyVerse</p>
      </div>
      <ScrollArea className="flex-1 px-2 py-2"> {/* Added padding to scroll area */}
        <div className="flex flex-col space-y-1">
          {roleFilteredNavItems.map(item => renderNavItem(item, isMobile))}
        </div>
      </ScrollArea>
      {user && (
        <div className="mt-auto p-2 border-t border-border">
           <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/profile')}>
             <User className="mr-2 h-4 w-4 flex-shrink-0" />
             <span className="truncate">{user.email?.split('@')[0] || user.id}</span>
           </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("hidden border-r bg-background h-screen w-60 md:flex md:flex-col", className)}>
        {sidebarContent()}
      </aside>

      {/* Mobile Sheet (Hamburger Menu) */}
      <div className={cn("md:hidden fixed top-2 left-2 z-50", className?.includes('md:flex') ? '' : 'block')}> {/* Ensure trigger is visible */}
         <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 flex flex-col bg-background"> {/* Ensure bg for sheet */}
            {sidebarContent(true)}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Sidebar;
