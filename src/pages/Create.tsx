
import MusicGenerationForm from "@/components/music-generation/MusicGenerationForm";

const Create = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create Music</h1>
      <p className="text-muted-foreground mb-6">Generate high-quality songs using AI</p>
      <MusicGenerationForm />
    </div>
  );
};

export default Create;
