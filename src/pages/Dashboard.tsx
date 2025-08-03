
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Music, Trophy, Star, UserPlus, DollarSign } from "lucide-react";
import { useGenreTemplates } from "@/hooks/use-genre-templates";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    songsGenerated: 0,
    contestsParticipated: 0,
    totalVotes: 0,
    creditsRemaining: 0
  });
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [hasApplication, setHasApplication] = useState(false);
  const { genreTemplates, loading: templatesLoading } = useGenreTemplates();

  useEffect(() => {
    if (user) {
      fetchUserStats();
      checkAffiliateStatus();
    }
  }, [user]);

  const checkAffiliateStatus = async () => {
    if (!user) return;
    
    try {
      // Check if user is already an affiliate
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'affiliate');
      
      setIsAffiliate(roles && roles.length > 0);
      
      // Check if user has an existing application
      const { data: applications } = await supabase
        .from('affiliate_applications')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved']);
        
      setHasApplication(applications && applications.length > 0);
    } catch (error) {
      console.error('Error checking affiliate status:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      // Fetch user's credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      // Fetch songs count
      const { count: songsCount } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch contest entries count
      const { count: contestsCount } = await supabase
        .from('contest_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch votes count
      const { count: votesCount } = await supabase
        .from('contest_votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        songsGenerated: songsCount || 0,
        contestsParticipated: contestsCount || 0,
        totalVotes: votesCount || 0,
        creditsRemaining: profile?.credits || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const StatCard = ({ icon: Icon, title, value, description }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.full_name || 'User'}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your music journey</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              icon={Music}
              title="Songs Generated"
              value={stats.songsGenerated}
              description="Total songs created"
            />
            <StatCard
              icon={Trophy}
              title="Contests Joined"
              value={stats.contestsParticipated}
              description="Contests participated"
            />
            <StatCard
              icon={Star}
              title="Total Votes"
              value={stats.totalVotes}
              description="Votes cast in contests"
            />
            <StatCard
              icon={Users}
              title="Credits"
              value={stats.creditsRemaining}
              description="Available credits"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with these popular actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full">
                  <Link to="/create">Create New Song</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/library">View My Library</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contest">Join Contest</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No recent activity to show</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="genres">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Available Genres</h2>
              <p className="text-muted-foreground">Choose from these genre templates to create your music</p>
            </div>
            
            {templatesLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {genreTemplates.map((template) => (
                  <GenreTemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="affiliate">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Affiliate Program</h2>
              <p className="text-muted-foreground">
                Earn money by referring new users to our platform
              </p>
            </div>

            {isAffiliate ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    You're an Affiliate!
                  </CardTitle>
                  <CardDescription>
                    Welcome to our affiliate program. Start earning by sharing your referral link.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link to="/affiliate-dashboard">Go to Affiliate Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : hasApplication ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Application Submitted
                  </CardTitle>
                  <CardDescription>
                    Your affiliate application is being reviewed. We'll notify you once it's processed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Status: Under Review
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Become an Affiliate
                  </CardTitle>
                  <CardDescription>
                    Join our affiliate program and start earning money by referring new users to our platform.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <div className="font-medium">Earn Commission</div>
                        <div className="text-muted-foreground">Get paid for every user you refer</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <div className="font-medium">Marketing Materials</div>
                        <div className="text-muted-foreground">Access promotional content and tools</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <div className="font-medium">Real-time Analytics</div>
                        <div className="text-muted-foreground">Track your referrals and earnings</div>
                      </div>
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/become-affiliate">Apply to Become an Affiliate</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
