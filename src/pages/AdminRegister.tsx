
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Music, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

// Admin email that should pass Supabase validation - using gmail.com domain
const ADMIN_EMAIL = "admin.melodyverse@gmail.com";
const ADMIN_PASSWORD = "Admin123!";
const ADMIN_CODE = "ADMIN123";

const AdminRegister = () => {
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [adminCode, setAdminCode] = useState(ADMIN_CODE);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (!email.trim()) {
      toast.error("Email cannot be empty");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    // In a real app, you would validate the admin code on the server
    if (adminCode !== ADMIN_CODE) {
      toast.error("Invalid admin code");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Registering admin:", { email, name });
      const success = await register(name, email, password, true); // true = admin
      if (success) {
        toast.success("Admin account created successfully");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Admin registration error:", error);
      toast.error("An unexpected error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 md:p-0">
      <div className="md:hidden flex items-center justify-center mb-6">
        <Music className="h-10 w-10 text-melody-secondary" />
        <h1 className="text-2xl font-bold ml-2">MelodyVerse</h1>
      </div>
      
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-2">
          <ShieldAlert className="h-6 w-6 text-melody-secondary mr-2" />
          <h2 className="text-3xl font-bold">Admin Registration</h2>
        </div>
        <p className="text-muted-foreground">Create an administrator account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            type="text" 
            placeholder="Admin Name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="admin@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use a valid email format with proper domain
          </p>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="adminCode">Admin Code</Label>
          <Input 
            id="adminCode" 
            type="text" 
            placeholder="Enter admin access code" 
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Admin code: {ADMIN_CODE} (for demo purposes)
          </p>
        </div>
        <Button 
          type="submit" 
          className="w-full bg-melody-secondary hover:bg-melody-secondary/90"
          disabled={loading}
        >
          {loading ? "Creating Admin Account..." : "Create Admin Account"}
        </Button>
      </form>

      <p className="text-center mt-8 text-sm">
        Already have an admin account?{" "}
        <Link to="/login" className="text-melody-secondary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default AdminRegister;
