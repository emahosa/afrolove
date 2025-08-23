
import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNotes } from "@/components/3d/FloatingNotes";
import { Music, ArrowLeft, Eye, EyeOff } from "lucide-react";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const referralCode = searchParams.get('ref');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Track referral if present
        if (referralCode) {
          try {
            const { error: trackingError } = await supabase.functions.invoke('track-referred-user-signup', {
              body: {
                referred_user_id: data.user.id,
                referral_code: referralCode
              }
            });
            
            if (trackingError) {
              console.error('Error tracking referral:', trackingError);
            }
          } catch (trackingError) {
            console.error('Error in referral tracking:', trackingError);
          }
        }

        toast.success("Registration successful! Please check your email to verify your account.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Floating Notes Background */}
      <FloatingNotes />
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Register Section */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            {/* Logo and Title */}
            <div className="text-center mb-8 animate-fade-in">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Music className="h-12 w-12 text-primary animate-pulse" />
                  <div className="absolute inset-0 h-12 w-12 text-primary/30 animate-ping"></div>
                </div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Afroverse
              </h1>
              <p className="text-muted-foreground">Start your musical journey today</p>
            </div>

            {/* Register Form */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-xl animate-scale-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>
                  Join thousands of creators making music with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background/50 border-border/50 focus:border-primary transition-all pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300" 
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Footer Links */}
            <div className="text-center mt-6 animate-fade-in">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
