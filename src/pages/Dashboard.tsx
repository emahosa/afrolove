import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Zap, Clock, TrendingUp, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MusicGenerationWorkflow from "@/components/music-generation/MusicGenerationWorkflow";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SampleMusic from "@/components/dashboard/SampleMusic";

const Dashboard = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin, session, logout } = useAuth();
  const navigate = useNavigate();

  // Debug output to track auth/session state
  console.log('🏠 Dashboard rendered for user:', user?.id);
  console.log('👤 User data:', user);
  console.log('🔑 Supabase session:', session);

  const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();

  const stats = [
    {
      title: "Available Credits",
      value: user?.credits || 0,
      icon: Zap,
      description: "Credits remaining",
      color: "text-blue-600"
    },
    {
      title: "Songs Generated",
      value: "12", // This would come from actual data
      icon: Music,
      description: "Total songs created",
      color: "text-green-600"
    },
    {
      title: "Processing",
      value: "2", // This would come from actual data
      icon: Clock,
      description: "Songs in progress",
      color: "text-yellow-600"
    },
    {
      title: "This Month",
      value: "8", // This would come from actual data
      icon: TrendingUp,
      description: "Songs created",
      color: "text-purple-600"
    }
  ];

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.username) {
      return user.user_metadata.username;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Music Creator';
  };

  const displayName = getUserDisplayName();
  console.log('📛 Display name:', displayName);

  const handleSubscribeClick = () => {
    alert("Subscription required to access this feature. Please visit our subscription page.");
  };

  // Force logout then reload to login page (step 1 of plan)
  const handleForceLogout = async () => {
    console.log("[DEBUG] 🔒 Force logout and redirect to /login");
    await logout();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login?force=1";
  };

  return (
    <div className="space-y-8">
      {/* SESSION DEBUG PANEL */}
      <div className="mb-4 p-3 rounded bg-amber-100 border border-amber-200 text-xs text-amber-900 flex flex-col gap-2 shadow">
        <div className="flex justify-between items-center">
          <span>
            <b>Session Debug:</b>{" "}
            <span>
              {session 
                ? (
                  <>
                    <span className="text-green-600">Session found</span> | <b>User ID:</b> {user?.id || <span className="text-red-600">N/A</span>}
                  </>
                )
                : (
                  <>
                    <span className="text-red-600">No session! <b>Your backend session is missing.</b></span>
                  </>
                )
              }
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex gap-1 items-center"
            onClick={handleForceLogout}
            type="button"
            title="Force clear session and re-login"
          >
            <LogOut className="w-4 h-4" /> Force Logout &amp; Re-Login
          </Button>
        </div>
        <pre className="overflow-x-auto bg-white border border-amber-200 rounded p-2 text-amber-900 max-h-32">
{JSON.stringify({ 
  userId: user?.id, 
  email: user?.email, 
  session: !!session, 
  accessToken: session?.access_token?.slice?.(0,6) ? session.access_token.slice(0, 12) + "..." : undefined,
  rlsDebug: session?.user?.role || "N/A"
}, null, 2)}
        </pre>
        <div>
          <span>🔍 If you see <b>No session</b> above, you are NOT correctly authenticated in the backend and RLS will prevent access to your data. Click "Force Logout & Re-Login" and try again.</span>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {displayName}! 
        </h1>
        <p className="text-muted-foreground">
          Create amazing music with AI-powered generation tools
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {userIsOnlyVoter ? (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-yellow-500" />
                Features Locked
              </CardTitle>
              <CardDescription>
                You are currently on a Voter account. Subscribe to unlock all features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                As a voter, you have access to participate in contests. To generate music, access your full library, and use other premium features, a subscription is required.
              </p>
              <Button onClick={handleSubscribeClick} className="w-full sm:w-auto">
                View Subscription Plans
              </Button>
            </CardContent>
          </Card>
          <SampleMusic />
        </div>
      ) : (
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="generate" 
              className="flex items-center gap-2"
            >
              <Music className="h-4 w-4" />
              Generate Music
            </TabsTrigger>
            <TabsTrigger 
              value="library" 
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              My Library
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-6">
            <MusicGenerationWorkflow />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <SongLibrary />
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pro Tips
          </CardTitle>
          <CardDescription>
            Get the most out of your music generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="secondary">Tip 1</Badge>
              <p className="text-sm">
                Be specific in your prompts. Instead of "pop song", try "upbeat pop song with electronic beats and catchy chorus"
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="secondary">Tip 2</Badge>
              <p className="text-sm">
                Use V4.5 model for best quality results. It's more advanced and produces higher fidelity audio
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="secondary">Tip 3</Badge>
              <p className="text-sm">
                For custom lyrics, structure them with [Verse], [Chorus], [Bridge] tags for better AI understanding
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
