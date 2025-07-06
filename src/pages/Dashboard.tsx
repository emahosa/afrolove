import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Sparkles, Users, CreditCard, Plus, Search, Vote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { useGenres, Genre } from "@/hooks/use-genres";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContestEntry {
  id: string;
  contest_id: string;
  user_id: string;
  description: string;
  vote_count: number;
  song_id: string | null;
  video_url: string | null;
  approved: boolean;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
  songs?: {
    title: string;
    audio_url: string;
  } | null;
}

const Dashboard = () => {
  const { user, isSubscriber, isVoter } = useAuth();
  const navigate = useNavigate();
  const { genres, loading: genresLoading } = useGenres();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserCredits();
      fetchContestEntries();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchContestEntries = async () => {
    setEntriesLoading(true);
    try {
      // First get contest entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('contest_entries')
        .select('*')
        .eq('approved', true)
        .order('vote_count', { ascending: false })
        .limit(12);

      if (entriesError) throw entriesError;

      // Transform entries with safe data handling
      const entriesWithDetails: ContestEntry[] = await Promise.all(
        (entriesData || []).map(async (entry) => {
          // Safely get profile data
          let profileData = null;
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', entry.user_id)
              .maybeSingle(); // Use maybeSingle instead of single
            
            if (!error && data) {
              profileData = data;
            }
          } catch (error) {
            console.warn('Failed to fetch profile for user:', entry.user_id, error);
          }

          // Safely get song data if song_id exists
          let songData = null;
          if (entry.song_id) {
            try {
              const { data, error } = await supabase
                .from('songs')
                .select('title, audio_url')
                .eq('id', entry.song_id)
                .maybeSingle(); // Use maybeSingle instead of single
              
              if (!error && data) {
                songData = data;
              }
            } catch (error) {
              console.warn('Failed to fetch song for entry:', entry.song_id, error);
            }
          }

          return {
            ...entry,
            profiles: profileData ? { 
              full_name: profileData.full_name || 'Unknown Artist' 
            } : null,
            songs: songData ? { 
              title: songData.title, 
              audio_url: songData.audio_url 
            } : null
          };
        })
      );

      setContestEntries(entriesWithDetails);
    } catch (error: any) {
      console.error('Error fetching contest entries:', error);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleGenreSelect = (genre: Genre) => {
    const searchParams = new URLSearchParams();
    searchParams.set('genre', genre.id);
    if (genre.sample_prompt) {
      searchParams.set('prompt', genre.sample_prompt);
    }
    navigate(`/create?${searchParams.toString()}`);
  };

  const handleCreateClick = () => {
    navigate("/create");
  };

  const handleCreditsClick = () => {
    navigate("/credits");
  };

  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (genre.description && genre.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    {
      title: "Available Credits",
      value: userCredits.toString(),
      description: "Create amazing songs",
      icon: CreditCard,
      action: handleCreditsClick
    },
    {
      title: "AI Music Generation",
      value: "Unlimited",
      description: "Create with AI power",
      icon: Sparkles,
      action: handleCreateClick
    },
    {
      title: "Community",
      value: "Active",
      description: "Join contests & vote",
      icon: Users,
      action: () => navigate("/contest")
    }
  ];

  if (genresLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Music Creator'}!</h1>
          <p className="text-muted-foreground mt-1">
            Create amazing music with AI-powered generation tools
          </p>
        </div>
        <Button onClick={handleCreateClick} className="bg-melody-secondary hover:bg-melody-secondary/90">
          <Plus className="mr-2 h-4 w-4" />
          Create New Song
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="cursor-pointer transition-colors hover:bg-accent" onClick={stat.action}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="genres" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="genres">Explore Genres</TabsTrigger>
          <TabsTrigger value="entries">Contest Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="genres" className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-full"
            />
          </div>

          {/* Pinterest-style Genre Templates Grid */}
          {filteredGenres.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Explore Genres</h2>
                <p className="text-sm text-muted-foreground">
                  Hover to preview • Click to create
                </p>
              </div>
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                {filteredGenres.map((genre) => (
                  <div key={genre.id} className="break-inside-avoid mb-4">
                    <GenreTemplateCard
                      genre={genre}
                      onSelect={handleGenreSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredGenres.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No genres found</h3>
              <p className="text-muted-foreground">Try adjusting your search query</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Featured Contest Entries</h2>
            <Button variant="outline" onClick={() => navigate("/contest")}>
              View All Contests
            </Button>
          </div>

          {entriesLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-primary"></div>
              <span className="ml-2">Loading contest entries...</span>
            </div>
          ) : contestEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Contest Entries Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to submit an entry to any contest
                </p>
                <Button onClick={() => navigate("/contest")}>
                  View Contests
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contestEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{entry.songs?.title || 'Contest Entry'}</CardTitle>
                    <CardDescription>
                      By {entry.profiles?.full_name || 'Unknown Artist'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {entry.description}
                    </p>
                    
                    {entry.songs?.audio_url && (
                      <audio controls className="w-full mb-4">
                        <source src={entry.songs.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </CardContent>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Vote className="h-4 w-4" />
                        <span className="text-sm">{entry.vote_count} votes</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Vote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Voter-specific message */}
      {isVoter() && !isSubscriber() && (
        <Card className="border-melody-accent">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music className="mr-2 h-5 w-5 text-melody-accent" />
              Unlock Full Creative Power
            </CardTitle>
            <CardDescription>
              Subscribe to access unlimited music generation, your personal library, and premium features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/subscribe")} className="bg-melody-accent hover:bg-melody-accent/90">
              View Subscription Plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
