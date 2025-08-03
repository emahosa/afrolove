import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Music, 
  User, 
  LogOut, 
  Settings, 
  CreditCard, 
  Trophy, 
  Users, 
  BarChart3,
  TrendingUp,
  Menu,
  X,
  Zap,
  Home
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const { user, signOut, isAdmin, isSuperAdmin, hasAdminPermission, isAffiliate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (user?.credits !== undefined) {
      setCredits(user.credits);
    }
  }, [user?.credits]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, show: !!user },
    { name: 'Create', href: '/create', icon: Music, show: !!user },
    { name: 'Library', href: '/library', icon: Music, show: !!user },
    { name: 'Contests', href: '/contests', icon: Trophy, show: !!user },
  ];

  const adminItems = [
    { name: 'Admin', href: '/admin', icon: Settings, show: isSuperAdmin() || hasAdminPermission('admin-dashboard') },
    { name: 'Users', href: '/admin/users', icon: Users, show: isSuperAdmin() || hasAdminPermission('manage-users') },
    { name: 'Contest Admin', href: '/admin/contests', icon: Trophy, show: isSuperAdmin() || hasAdminPermission('manage-contests') },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, show: isSuperAdmin() || hasAdminPermission('analytics') },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Afroverse
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navigationItems.map((item) => 
                item.show && (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary ${
                      isActiveRoute(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            {user && (
              <Link to="/credits">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{credits}</span>
                </Button>
              </Link>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>

            {/* User menu or auth buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt="Avatar" />
                      <AvatarFallback>
                        {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                          {credits} credits
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/credits')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Buy Credits</span>
                  </DropdownMenuItem>

                  {/* Affiliate Menu Item */}
                  {isAffiliate() && (
                    <DropdownMenuItem onClick={() => navigate('/affiliate')}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      <span>Affiliate Dashboard</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  
                  {/* Admin Menu Items */}
                  {adminItems.some(item => item.show) && (
                    <>
                      <DropdownMenuLabel>Admin</DropdownMenuLabel>
                      {adminItems.map((item) =>
                        item.show && (
                          <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                          </DropdownMenuItem>
                        )
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t">
              {navigationItems.map((item) =>
                item.show && (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 text-base font-medium transition-colors hover:text-primary ${
                      isActiveRoute(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                )
              )}
              
              {!user && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/auth');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/auth');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
