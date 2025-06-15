
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateCustomSongForm } from "@/components/custom-song/CreateCustomSongForm";
import { AiSongGeneratorForm } from "@/components/ai-song/AiSongGeneratorForm";

const Create = () => {
  const [mainTab, setMainTab] = useState("create-song");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate high-quality songs with AI or request a custom-made track.</p>
      
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create-song">Create Song (AI)</TabsTrigger>
          <TabsTrigger value="create-custom-song">Request Custom Song</TabsTrigger>
        </TabsList>
        <TabsContent value="create-song">
          <AiSongGeneratorForm />
        </TabsContent>
        <TabsContent value="create-custom-song">
          <CreateCustomSongForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Create;
