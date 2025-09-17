import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuthPageLayout from "@/layouts/AuthPageLayout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_SITE_URL}/reset-password`,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setMessage("Password reset link has been sent to your email.");
      toast.success("Password reset link has been sent to your email.");
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
          <h2 className="text-3xl font-semibold mb-2 text-white">Forgot Password</h2>
          <p className="text-gray-400">Enter your email to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-300 text-left block mb-1">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-deep-purple font-bold"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        {message && <p className="mt-4 text-center text-green-500">{message}</p>}
        <p className="text-center mt-6 text-sm text-gray-400">
          Remember your password?{" "}
          <Link to="/login" className="text-dark-purple hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
};

export default ForgotPassword;
