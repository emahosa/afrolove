
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Play, Music, Trophy, Users, Sparkles, ArrowRight, Mic, HeadphonesIcon, Star } from 'lucide-react';
import { useGenres } from '@/hooks/use-genres';
import { Genre } from '@/hooks/use-genres';
import GenreTemplateCard from '@/components/dashboard/GenreTemplateCard';
import SampleMusic from '@/components/dashboard/SampleMusic';
import FloatingNotes from '@/components/3d/FloatingNotes';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  credits: number;
  avatar_url?: string;
}

interface UserStats {
  totalSongs: number;
  totalCredits: number;
  contestEntries: number;
  isSubscriber: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalSongs: 0,
    totalCredits: 0,
    contestEntries: 0,
    isSubscriber: false
  });
  const [loading, setLoading] = useState(true);
  const { genres } = useGenres();
  const [isVoterOnly, setIsVoterOnly] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Check if user is voter only
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isVoter = roleData?.some(r => r.role === 'voter') || false;
      const hasOtherRoles = roleData?.some(r => r.role !== 'voter') || false;
      setIsVoterOnly(isVoter && !hasOtherRoles);

      // Fetch user stats
      const [songsResult, contestResult, subscriptionResult] = await Promise.all([
        supabase.from('songs').select('id').eq('user_id', user.id),
        supabase.from('contest_entries').select('id').eq('user_id', user.id),
        supabase.from('user_subscriptions')
          .select('subscription_status')
          .eq('user_id', user.id)
          .eq('subscription_status', 'active')
          .single()
      ]);

      setStats({
        totalSongs: songsResult.data?.length || 0,
        totalCredits: profileData?.credits || 0,
        contestEntries: contestResult.data?.length || 0,
        isSubscriber: !!subscriptionResult.data
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          <p className="text-white/80">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Create Music',
      description: 'Generate AI-powered songs',
      icon: Music,
      color: 'from-purple-500 to-pink-500',
      action: () => navigate('/create'),
      disabled: isVoterOnly
    },
    {
      title: 'My Library',
      description: 'View your created songs',
      icon: HeadphonesIcon,
      color: 'from-blue-500 to-cyan-500',
      action: () => navigate('/library'),
      disabled: false
    },
    {
      title: 'Contests',
      description: 'Join music competitions',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-500',
      action: () => navigate('/contest'),
      disabled: false
    },
    {
      title: 'Upgrade Plan',
      description: 'Unlock premium features',
      icon: Star,
      color: 'from-green-500 to-emerald-500',
      action: () => navigate('/subscription'),
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 relative overflow-hidden">
      <FloatingNotes />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Welcome back, {profile?.full_name || profile?.username || 'Creator'}! 🎵
            </h1>
            <p className="text-white/80 text-lg">
              Ready to create some amazing music today?
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Credits</CardTitle>
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCredits}</div>
              <p className="text-xs text-white/60">Available for music creation</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Songs Created</CardTitle>
              <Music className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSongs}</div>
              <p className="text-xs text-white/60">Total compositions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Contest Entries</CardTitle>
              <Trophy className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contestEntries}</div>
              <p className="text-xs text-white/60">Competition submissions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Plan Status</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant={stats.isSubscriber ? "default" : "secondary"} className="text-sm">
                  {stats.isSubscriber ? "Premium" : isVoterOnly ? "Voter" : "Free"}
                </Badge>
              </div>
              <p className="text-xs text-white/60 mt-1">Current subscription</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={index}
                  className={`bg-gradient-to-br ${action.color} border-0 hover:scale-105 transition-all duration-300 cursor-pointer group ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={action.disabled ? undefined : action.action}
                >
                  <CardContent className="p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="h-8 w-8" />
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                    <p className="text-white/80 text-sm">{action.description}</p>
                    {action.disabled && (
                      <p className="text-white/60 text-xs mt-2">Upgrade to access</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Genre Templates or Sample Music */}
        {isVoterOnly ? (
          <SampleMusic />
        ) : (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-400" />
                Music Genres
              </CardTitle>
              <p className="text-white/70">Choose a genre to start creating</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {genres.slice(0, 8).map((genre: Genre) => (
                  <GenreTemplateCard key={genre.id} template={genre} />
                ))}
              </div>
              
              {genres.length > 8 && (
                <div className="text-center mt-6">
                  <Button 
                    onClick={() => navigate('/create')}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    View All Genres
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
