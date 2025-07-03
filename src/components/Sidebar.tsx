import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "../../contexts/AuthContext";
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
  Plus,
  Folder,
  Settings
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  adminOnly?: boolean;
  affiliateOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Music },
  { href: "/library", label: "Library", icon: Library },
  { href: "/contest", label: "Contest", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/credits", label: "Credits", icon: CreditCard },
  { href: "/support", label: "Support", icon: HelpCircle },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true },
  { href: "/affiliate", label: "Affiliate", icon: Folder, affiliateOnly: true },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Function to check if a user has a specific role
  const hasRole = (roles: string[] | undefined, requiredRole: string): boolean => {
    return !!roles?.includes(requiredRole);
  };

// Function to check if a user has a specific role
  // const hasRole = (roles: string[] | undefined, requiredRole: string): boolean => {
  //   return !!roles?.includes(requiredRole);
  // };

  // Mock user roles (replace with actual authentication context)
  // const userRoles = ['user', 'affiliate', 'admin']; // Example roles
  const { userRoles, isAdmin, isAffiliate } = useAuth();


  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin()) {
      return false;
    }
    if (item.affiliateOnly && !isAffiliate()) {
      return false;
    }
    return true;
  });

  return (
    <div className={cn("hidden border-r bg-melody-dark h-screen w-60 flex-col p-3 duration-300 md:flex", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">MelodyVerse</p>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60">
            <ScrollArea className="my-4">
              <div className="flex flex-col space-y-1">
                {visibleNavItems.map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate(item.href);
                      setOpen(false);
                    }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
      <ScrollArea className="flex-1 space-y-4">
        <div className="flex flex-col space-y-1">
          {visibleNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
