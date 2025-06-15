
import { Wand2, Sparkles } from "lucide-react";
import CustomSongCreation from "@/components/CustomSongCreation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SunoCreation from "@/components/SunoCreation";

const Create = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create</h1>
      <p className="text-muted-foreground mb-6">Generate high-quality songs using AI or work with our team for a custom track</p>
      
      <Tabs defaultValue="create-song" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create-song" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Create Song
          </TabsTrigger>
          <TabsTrigger value="custom-song" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Custom Song
          </TabsTrigger>
        </TabsList>
        <TabsContent value="create-song" className="mt-6">
          <SunoCreation />
        </TabsContent>
        <TabsContent value="custom-song" className="mt-6">
          <CustomSongCreation />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Create;
