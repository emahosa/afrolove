import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This event is triggered when the user clicks the password recovery link.
        // The session is now active, and we can update the password.
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/login");
    }
  };

  return (
    <AuthPageLayout>
      <div className="w-full max-w-md bg-white/5 p-8 rounded-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-center mb-6">
            <Music className="h-8 w-8 text-dark-purple" />
            <h1 className="text-2xl font-bold ml-2 text-white">Afromelody</h1>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-semibold mb-2 text-white">Reset Password</h2>
          <p className="text-gray-400">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </AuthPageLayout>
  );
};

export default ResetPassword;
