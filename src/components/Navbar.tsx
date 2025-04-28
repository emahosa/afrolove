
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Bell, Music, LogOut, User, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-border/30 bg-background sticky top-0 z-10">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-melody-secondary" />
            <span className="font-montserrat font-bold text-xl">MelodyVerse</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/credits" className="flex items-center mr-2 group">
            <div className="flex items-center px-2 py-1 rounded-md hover:bg-accent/50 transition-colors">
              <Star className="h-4 w-4 text-melody-secondary mr-1 group-hover:animate-pulse" />
              <span className="text-sm font-medium">{user?.credits || 0}</span>
            </div>
          </Link>
          
          <Button variant="outline" size="icon" className="text-muted-foreground">
            <Bell className="h-[1.2rem] w-[1.2rem]" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="text-sm">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="flex items-center cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
