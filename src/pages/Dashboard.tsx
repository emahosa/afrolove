
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Sparkles, Users, CreditCard, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GenreTemplateCard } from "@/components/dashboard/GenreTemplateCard";
import { useGenres, Genre } from "@/hooks/use-genres";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, isSubscriber, isVoter } = useAuth();
  const navigate = useNavigate();
  const { genres, loading: genresLoading } = useGenres();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchUserCredits();
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

  const handleGenreSelect = (genre: Genre) => {
    // Navigate to create page with pre-selected genre and sample prompt
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
