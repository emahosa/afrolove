
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Music, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SunoGenerationForm } from '@/components/suno/SunoGenerationForm';
import { CreateSongRequestDialog } from '@/components/song-management/CreateSongRequestDialog';
import { useUserSongRequests } from '@/hooks/use-user-song-requests';
import { UserRequestCard } from '@/components/song-management/UserRequestCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Create = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { userRequests, loading, error, refetch } = useUserSongRequests();

  const handleRequestCreated = () => {
    refetch();
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Create Music</h1>
        <p className="text-muted-foreground mb-8">
          Generate songs with AI, or request a custom track from our professional artists.
        </p>

        <Tabs defaultValue="ai-generation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="ai-generation" className="py-3 text-sm md:text-base flex items-center gap-2">
              <Music className="h-4 w-4" /> AI Song Generation
            </TabsTrigger>
            <TabsTrigger value="custom-requests" className="py-3 text-sm md:text-base flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Custom Song Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-generation" className="mt-4">
            <SunoGenerationForm onSuccess={() => refetch()} />
          </TabsContent>

          <TabsContent value="custom-requests" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <CardTitle>Your Custom Song Requests</CardTitle>
                    <CardDescription>
                      Track the status of your custom song requests here.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Request
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && error && (
                  <div className="text-center py-10 text-destructive">
                    <p>Error loading requests: {error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                      Try Again
                    </Button>
                  </div>
                )}
                {!loading && !error && userRequests.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">No requests yet</h3>
                    <p className="text-muted-foreground mt-1">
                      Click "New Request" to get started on a custom song.
                    </p>
                  </div>
                )}
                {!loading && !error && userRequests.length > 0 && (
                  <div className="space-y-4">
                    {userRequests.map((request) => (
                      <UserRequestCard key={request.id} request={request} onUpdate={refetch} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateSongRequestDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleRequestCreated}
        />
      </div>
    </div>
  );
};

export default Create;
