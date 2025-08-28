
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Bell, Music, LogOut, User, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-30">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden text-white/80 hover:bg-white/10 hover:text-white">
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-dark-purple" />
            <span className="font-poppins font-bold text-xl text-white">Afroverse</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to="/credits" className="flex items-center mr-2 group">
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
              <Star className="h-4 w-4 text-dark-purple mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-white">{user?.credits || 0}</span>
            </div>
          </Link>
          
          <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="text-sm bg-dark-purple text-white">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/50 border-white/10 text-white backdrop-blur-lg">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer focus:bg-white/10">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer focus:bg-white/10 text-red-400 focus:text-red-400">
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
