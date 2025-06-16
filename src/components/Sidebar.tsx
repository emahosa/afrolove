import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Music,
  AudioLines,
  Trophy,
  FileAudio,
  Coins,
  User,
  HelpCircle,
  Shield,
  Users,
  Key,
  BarChart3,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  isActive: boolean;
}

const getUserNavigationSections = (
  isAdmin: boolean,
  isSuperAdmin: boolean,
  isVoter: boolean,
  isSubscriber: boolean
): NavItem[][] => {
  const adminStatus = isAdmin || isSuperAdmin;
  const userIsOnlyVoter = isVoter && !isSubscriber && !adminStatus;

  // Core navigation items that all users should see
  const coreNavigationItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      isActive: false,
    },
    {
      title: "Create",
      href: "/create",
      icon: Music,
      isActive: false,
    },
    {
      title: "Library",
      href: "/library",
      icon: AudioLines,
      isActive: false,
    },
    {
      title: "Contest",
      href: "/contest",
      icon: Trophy,
      isActive: false,
    },
  ];

  // Additional subscriber features
  const subscriberFeatures = [
    {
      title: "My Custom Songs",
      href: "/my-custom-songs",
      icon: FileAudio,
      isActive: false,
    },
    {
      title: "Credits",
      href: "/credits",
      icon: Coins,
      isActive: false,
    },
  ];

  // User management features
  const userFeatures = [
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      isActive: false,
    },
    {
      title: "Support",
      href: "/support",
      icon: HelpCircle,
      isActive: false,
    },
  ];

  // Admin navigation items
  const adminNavigationItems = [
    {
      title: "Admin Dashboard",
      href: "/admin",
      icon: Shield,
      isActive: false,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
      isActive: false,
    },
    {
      title: "Custom Songs",
      href: "/admin/custom-songs",
      icon: FileAudio,
      isActive: false,
    },
    {
      title: "Genres",
      href: "/admin/genres",
      icon: Music,
      isActive: false,
    },
    {
      title: "API Keys",
      href: "/admin/api-keys",
      icon: Key,
      isActive: false,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
      isActive: false,
    },
  ];

  let navigation: NavItem[][] = [];

  navigation.push(coreNavigationItems);

  if (isSubscriber || adminStatus) {
    navigation.push(subscriberFeatures);
  }

  navigation.push(userFeatures);

  if (adminStatus) {
    navigation.push(adminNavigationItems);
  }

  if (userIsOnlyVoter) {
    navigation = navigation.map((section) =>
      section.filter((item) =>
        ["Dashboard", "Contest", "Profile", "Support"].includes(item.title)
      )
    );
  }

  return navigation;
};

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const { user, isAdmin, isSuperAdmin, isVoter, isSubscriber } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const adminStatus = isAdmin() || isSuperAdmin();
  const userIsOnlyVoter = isVoter() && !isSubscriber() && !adminStatus;

  // Core navigation items that all users should see
  const coreNavigationItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      isActive: isActive("/dashboard"),
    },
    {
      title: "Create",
      href: "/create",
      icon: Music,
      isActive: isActive("/create"),
    },
    {
      title: "Library",
      href: "/library",
      icon: AudioLines,
      isActive: isActive("/library"),
    },
    {
      title: "Contest",
      href: "/contest",
      icon: Trophy,
      isActive: isActive("/contest"),
    },
  ];

  // Additional subscriber features
  const subscriberFeatures = [
    {
      title: "My Custom Songs",
      href: "/my-custom-songs",
      icon: FileAudio,
      isActive: isActive("/my-custom-songs"),
    },
    {
      title: "Credits",
      href: "/credits",
      icon: Coins,
      isActive: isActive("/credits"),
    },
  ];

  // User management features
  const userFeatures = [
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      isActive: isActive("/profile"),
    },
    {
      title: "Support",
      href: "/support",
      icon: HelpCircle,
      isActive: isActive("/support"),
    },
  ];

  // Admin navigation items
  const adminNavigationItems = [
    {
      title: "Admin Dashboard",
      href: "/admin",
      icon: Shield,
      isActive: isActive("/admin") && location.pathname === "/admin",
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
      isActive: isActive("/admin/users"),
    },
    {
      title: "Custom Songs",
      href: "/admin/custom-songs",
      icon: FileAudio,
      isActive: isActive("/admin/custom-songs"),
    },
    {
      title: "Genres",
      href: "/admin/genres",
      icon: Music,
      isActive: isActive("/admin/genres"),
    },
    {
      title: "API Keys",
      href: "/admin/api-keys",
      icon: Key,
      isActive: isActive("/admin/api-keys"),
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
      isActive: isActive("/admin/reports"),
    },
  ];

  // Build final navigation based on user role
  let finalNavigation = [...coreNavigationItems];

  // Add subscriber features for subscribers and admins
  if (isSubscriber() || adminStatus) {
    finalNavigation.push(...subscriberFeatures);
  }

  // Add user management features for all users
  finalNavigation.push(...userFeatures);

  // Add admin features for admin users
  if (adminStatus) {
    finalNavigation.push({ title: "divider", href: "", icon: null, isActive: false });
    finalNavigation.push(...adminNavigationItems);
  }

  // Filter out features for voters only
  if (userIsOnlyVoter) {
    finalNavigation = finalNavigation.filter(item => 
      ["Dashboard", "Contest", "Profile", "Support"].includes(item.title) || item.title === "divider"
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={() => setIsOpen(false)}
      />
      
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-bold text-lg">Melody Muse</span>
            <button
              className="p-2 text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              onClick={() => setIsOpen(false)}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {finalNavigation.map((item, index) => {
              if (item.title === "divider") {
                return (
                  <div key={index} className="my-4 border-t border-sidebar-border"></div>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  {item.icon && <item.icon className="w-5 h-5 mr-3" />}
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="px-4 py-3 border-t border-sidebar-border">
            <p className="text-xs text-center">
              &copy; {new Date().getFullYear()} Melody Muse. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
