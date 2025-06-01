
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Zap, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MusicGenerationWorkflow from "@/components/music-generation/MusicGenerationWorkflow";
import SongLibrary from "@/components/music-generation/SongLibrary";

const Dashboard = () => {
  const { user } = useAuth();

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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.full_name || user?.username || 'Music Creator'}! 
        </h1>
        <p className="text-muted-foreground">
          Create amazing music with AI-powered generation tools
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Generate Music
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
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

      {/* Quick Tips */}
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
