
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Home, Music, Library, Trophy, User, Plus, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const { user } = useAuth();

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-20 w-64 bg-card border-r border-border/30 transform transition-transform duration-200 ease-in-out md:relative md:transform-none",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="h-16 border-b border-border/30 flex items-center justify-between px-4 md:hidden">
        <div className="font-montserrat font-bold text-lg">Menu</div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex flex-col h-[calc(100%-4rem)] p-4 justify-between">
        <div className="space-y-1">
          <NavLink to="/dashboard" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/create" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Plus className="h-5 w-5" />
            <span>Create</span>
          </NavLink>
          
          <NavLink to="/library" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Library className="h-5 w-5" />
            <span>Library</span>
          </NavLink>
          
          <NavLink to="/contest" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Trophy className="h-5 w-5" />
            <span>Contest</span>
          </NavLink>
          
          <NavLink to="/profile" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <User className="h-5 w-5" />
            <span>Profile</span>
          </NavLink>

          <NavLink to="/credits" className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            isActive 
              ? "bg-melody-primary/20 text-melody-secondary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Star className="h-5 w-5" />
            <span>Get Credits</span>
          </NavLink>
        </div>
        
        <div>
          <NavLink to="/credits" className="block">
            <div className="bg-card border border-border/50 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">Available Credits</div>
              <div className="flex items-center mb-3">
                <Star className="h-5 w-5 text-melody-secondary mr-2 fill-melody-secondary" />
                <span className="text-xl font-bold">{user?.credits}</span>
              </div>
              <Button size="sm" className="w-full bg-melody-secondary hover:bg-melody-secondary/90">
                Get More Credits
              </Button>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
