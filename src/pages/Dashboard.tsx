
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Zap, Clock, TrendingUp, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MusicGenerationWorkflow from "@/components/music-generation/MusicGenerationWorkflow";
import SongLibrary from "@/components/music-generation/SongLibrary";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SampleMusic from "@/components/dashboard/SampleMusic";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, isVoter, isSubscriber, isAdmin, isSuperAdmin, isAffiliate, loading, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [canApplyForAffiliate, setCanApplyForAffiliate] = useState(false);
  const [checkingAffiliateStatus, setCheckingAffiliateStatus] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalSongs: 0,
    completedSongs: 0,
    processingSongs: 0,
    monthSongs: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch real dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingStats(true);
        
        // Get total songs
        const { count: totalSongs } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get completed songs
        const { count: completedSongs } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed');

        // Get processing songs
        const { count: processingSongs } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing']);

        // Get songs created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthSongs } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        setDashboardStats({
          totalSongs: totalSongs || 0,
          completedSongs: completedSongs || 0,
          processingSongs: processingSongs || 0,
          monthSongs: monthSongs || 0
        });
        
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [user?.id]);

  // Check payment success and refresh user data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    const subscriptionSuccess = urlParams.get('subscription') === 'success';

    if ((paymentSuccess || subscriptionSuccess) && user) {
      const initialCredits = user.credits;
      const initialSubscriptionStatus = isSubscriber(); // from AuthContext
      let attempts = 0;
      const maxAttempts = 10; // Poll for roughly 20-30 seconds
      const pollInterval = 3000; // 3 seconds

      const pollForUpdate = async () => {
        attempts++;
        await refreshUserData(); // This should update the user object in AuthContext

        // Access the latest user data from AuthContext after refresh
        // We need to ensure AuthContext has re-rendered and provided the new user object.
        // This might require a small delay or a more direct way to get the updated user from refreshUserData.
        // For now, we'll assume refreshUserData updates context, and we rely on subsequent renders.
        // A better approach might be for refreshUserData to return the new user object.

        // The user object from useAuth() might not be updated immediately in this same render cycle.
        // This is a common React state update nuance.
        // To get the latest user object, we'd typically rely on a subsequent re-render
        // or have refreshUserData return the new state.

        // Let's simulate checking updated values (in a real scenario, you'd get this from context state post-update)
        // This part is tricky because `user` and `isSubscriber()` captured at the start of `useEffect`
        // won't reflect changes from `refreshUserData` within the same `pollForUpdate` call.
        // We'll proceed with a simplified check assuming `refreshUserData` eventually updates the context,
        // and the user will see the changes on a subsequent render. The polling mainly ensures we *try* to refresh.

        console.log(`Polling attempt ${attempts} for payment/subscription update.`);

        // For a more robust check, refreshUserData would need to return the new user state,
        // or we'd need to subscribe to changes in AuthContext more directly here.
        // Given the current structure, the best we can do is repeatedly call refreshUserData.
        // The UI will update when AuthContext's state changes.

        if (attempts < maxAttempts) {
          setTimeout(pollForUpdate, pollInterval);
        } else {
          console.warn("Polling timed out. User data might not be immediately updated. Webhook should eventually sync.");
          toast.info("Your purchase is processing. The update will reflect shortly. You can also try refreshing the page.", { duration: 10000 });
        }
      };

      // Start polling
      toast.info("Processing your purchase...", { duration: 5000 });
      pollForUpdate();

      // Clean up URL params
      const newUrl = window.location.pathname;
      navigate(newUrl, { replace: true });
    }
  }, [user, refreshUserData, navigate, isSubscriber]); // Added user and isSubscriber to dependencies

  // Check affiliate application status
  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!user?.id || !isSubscriber() || isAffiliate() || isAdmin() || isSuperAdmin()) {
        setCanApplyForAffiliate(false);
        setCheckingAffiliateStatus(false);
        return;
      }

      try {
        const { data: existingApplication, error } = await supabase
          .from('affiliate_applications')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['pending', 'approved'])
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking affiliate status:', error);
          setCanApplyForAffiliate(false);
        } else {
          setCanApplyForAffiliate(!existingApplication);
        }
      } catch (err) {
        console.error('Unexpected error checking affiliate status:', err);
        setCanApplyForAffiliate(false);
      } finally {
        setCheckingAffiliateStatus(false);
      }
    };

    checkAffiliateStatus();
  }, [user?.id, isSubscriber, isAffiliate, isAdmin, isSuperAdmin]);

  console.log('🏠 Dashboard rendered for user:', user?.id);
  console.log('👤 User roles check:', { 
    isVoter: isVoter(), 
    isSubscriber: isSubscriber(), 
    isAdmin: isAdmin(), 
    isSuperAdmin: isSuperAdmin(),
    isAffiliate: isAffiliate(),
    loading 
  });

  // Show loading state while auth is loading
  if (loading || checkingAffiliateStatus) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  // Check user roles properly - voter only (not subscriber, not admin)
  const userIsOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  
  console.log('🔍 Role determination:', {
    userIsOnlyVoter,
    hasVoterRole: isVoter(),
    hasSubscriberRole: isSubscriber(),
    hasAdminRole: isAdmin(),
    hasSuperAdminRole: isSuperAdmin(),
    canApplyForAffiliate,
  });

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
      value: loadingStats ? "..." : dashboardStats.totalSongs,
      icon: Music,
      description: "Total songs created",
      color: "text-green-600"
    },
    {
      title: "Processing",
      value: loadingStats ? "..." : dashboardStats.processingSongs,
      icon: Clock,
      description: "Songs in progress",
      color: "text-yellow-600"
    },
    {
      title: "This Month",
      value: loadingStats ? "..." : dashboardStats.monthSongs,
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
    navigate("/subscribe");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {displayName}! 
        </h1>
        <p className="text-muted-foreground">
          Create amazing music with AI-powered generation tools
        </p>
      </div>

      {canApplyForAffiliate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Join Our Affiliate Program!</CardTitle>
            <CardDescription>Earn commissions by referring new users to Afroverse.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/become-affiliate")}>Apply to be an Affiliate</Button>
          </CardContent>
        </Card>
      )}
      
      {!userIsOnlyVoter && (
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
      )}

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
      </div>
    </div>
  );
};

export default Dashboard;
