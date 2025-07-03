
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomSongCreation from "@/components/CustomSongCreation";
import AiSongGeneration from "@/components/AiSongGeneration";
import { useAuth } from "@/contexts/AuthContext";
import VoterLockScreen from "@/components/VoterLockScreen";

const Create = () => {
  const { isVoter, isSubscriber, isAdmin, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Check if user is only a voter (no subscriber/admin roles)
  const isOnlyVoter = isVoter() && !isSubscriber() && !isAdmin() && !isSuperAdmin();
  
  if (isOnlyVoter) {
    return <VoterLockScreen feature="music creation tools" />;
  }
  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Create Your Next Hit
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Generate songs with our powerful AI or collaborate with our professional team for a fully custom track.
        </p>
      </div>
      
      <Tabs defaultValue="ai-generation" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1">
          <TabsTrigger value="ai-generation" className="text-base">AI Song Generation</TabsTrigger>
          <TabsTrigger value="custom-song" className="text-base">Custom Song (with Team)</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-generation" className="mt-6">
          <AiSongGeneration />
        </TabsContent>

        <TabsContent value="custom-song" className="mt-6">
          <CustomSongCreation />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Create;
