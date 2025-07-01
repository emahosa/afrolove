
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Settings,
  Users,
  ChevronDown,
  ChevronRight,
  Headphones,
  FileMusic,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const { user, userRoles } = useAuth();
  const location = useLocation();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const isAdmin = userRoles?.includes('admin') || userRoles?.includes('super_admin') || user?.email === 'ellaadahosa@gmail.com';
  const isAffiliate = userRoles?.includes('affiliate') || isAdmin;

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Create", href: "/create", icon: Music },
    { name: "Library", href: "/library", icon: Library },
    { name: "Contest", href: "/contest", icon: Trophy },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Credits", href: "/credits", icon: CreditCard },
    { name: "Support", href: "/support", icon: HelpCircle },
    { name: "My Custom Songs", href: "/my-custom-songs", icon: Headphones },
    { name: "Custom Songs Management", href: "/custom-songs-management", icon: FileMusic },
    { name: "Become Affiliate", href: "/become-affiliate", icon: UserPlus },
  ];

  const adminItems = [
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Admins", href: "/admin/admins", icon: Settings },
    { name: "Genres", href: "/admin/genres", icon: Music },
    { name: "Custom Songs", href: "/admin/custom-songs", icon: Headphones },
    { name: "API Keys", href: "/admin/api-keys", icon: Settings },
    { name: "Contest", href: "/admin/contest", icon: Trophy },
    { name: "Content", href: "/admin/content", icon: Library },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Support", href: "/admin/support", icon: HelpCircle },
    { name: "Reports", href: "/admin/reports", icon: Settings },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "Affiliates", href: "/admin", icon: DollarSign },
  ];

  return (
    <div className="pb-12 w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <ScrollArea className="h-[400px] px-1">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.name}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              ))}
              
              {isAffiliate && (
                <Button
                  variant={location.pathname === "/affiliate" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/affiliate">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Affiliate Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>

        {isAdmin && (
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              className="w-full justify-between mb-2 px-4"
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            >
              <span className="text-lg font-semibold tracking-tight">Admin</span>
              {adminMenuOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            {adminMenuOpen && (
              <ScrollArea className="h-[300px] px-1">
                <div className="space-y-1">
                  {adminItems.map((item) => (
                    <Button
                      key={item.name}
                      variant={location.pathname === item.href ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        location.pathname === item.href && "bg-secondary"
                      )}
                      asChild
                    >
                      <Link to={item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
