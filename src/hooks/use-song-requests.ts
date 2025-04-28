import { useState } from "react";
import { toast } from "sonner";

export type SongRequest = {
  id: string;
  title: string;
  user: string;
  description: string;
  genre: string;
  status: string;
  created_at: string;
  lyrics?: string;
  audio_url?: string;
};

export const useSongRequests = () => {
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [lyricsDraft, setLyricsDraft] = useState("");
  
  const [songRequests, setSongRequests] = useState<SongRequest[]>([
    { 
      id: "1", 
      title: "Summer Love Song", 
      user: "john@example.com", 
      description: "An upbeat summer love song with catchy chorus", 
      genre: "Pop", 
      status: "pending",
      created_at: "2023-04-20"
    },
    { 
      id: "2", 
      title: "Rainy Day Blues", 
      user: "sarah@example.com", 
      description: "A melancholic blues song about rainy days in the city", 
      genre: "Blues", 
      status: "lyrics_review",
      created_at: "2023-04-18",
      lyrics: "Rainy days in the city\nWatching people go by\nDrops on my window\nReflecting my state of mind\n\nThese blues won't leave me alone\nAs the sky keeps crying its tears\nThese rainy day blues\nWash away all my fears"
    },
    { 
      id: "3", 
      title: "Electronic Dreams", 
      user: "mike@example.com", 
      description: "A futuristic electronic track with synthesizer and vocal chops", 
      genre: "Electronic", 
      status: "completed",
      created_at: "2023-04-15",
      lyrics: "Digital dreams in the night\nElectronic pulses of light\nSynthesized reality\nIn a world of virtuality",
      audio_url: "https://example.com/audio/song3.mp3"
    },
    { 
      id: "4", 
      title: "Rock Anthem", 
      user: "emma@example.com", 
      description: "A powerful rock anthem with guitar solos and motivational lyrics", 
      genre: "Rock", 
      status: "in_progress",
      created_at: "2023-04-12"
    },
    { 
      id: "5", 
      title: "Acoustic Memories", 
      user: "david@example.com", 
      description: "A gentle acoustic song about childhood memories", 
      genre: "Folk", 
      status: "lyrics_accepted",
      created_at: "2023-04-10",
      lyrics: "Childhood days under the sun\nRunning through fields having fun\nMemories etched in my mind\nThose simple days were so kind"
    },
    { 
      id: "6", 
      title: "Jazz Improv", 
      user: "lisa@example.com", 
      description: "A smooth jazz improvisation with piano and saxophone", 
      genre: "Jazz", 
      status: "lyrics_rejected",
      created_at: "2023-04-08",
      lyrics: "Smooth notes floating through the air\nSax and piano make a perfect pair\nImprovised melodies take me away\nTo a place where music has its say"
    },
  ]);

  const handleStartWork = (id: string) => {
    setSongRequests(songRequests.map(request => 
      request.id === id ? {...request, status: "in_progress"} : request
    ));
    
    toast.success("Request Updated", {
      description: "Song request marked as in progress."
    });
  };

  const handleWriteLyrics = (id: string) => {
    setSelectedRequest(id);
    const request = songRequests.find(r => r.id === id);
    setLyricsDraft(request?.lyrics || "");
  };

  const handleSaveLyrics = () => {
    if (!selectedRequest) return;
    
    setSongRequests(songRequests.map(request => 
      request.id === selectedRequest 
        ? {...request, lyrics: lyricsDraft, status: "lyrics_review"} 
        : request
    ));
    
    setSelectedRequest(null);
    
    toast.success("Lyrics Saved", {
      description: "Lyrics have been sent to user for review."
    });
  };

  const handleRecreateLyrics = (id: string) => {
    const request = songRequests.find(r => r.id === id);
    if (request) {
      setSelectedRequest(id);
      setLyricsDraft(request.lyrics || "");
      
      toast.info("Recreating Lyrics", {
        description: "You can now edit the lyrics for this song request."
      });
    }
  };

  const handleUploadAudio = (id: string) => {
    setUploadingAudio(true);
    
    setTimeout(() => {
      setSongRequests(songRequests.map(request => 
        request.id === id 
          ? {
              ...request, 
              status: "completed", 
              audio_url: `https://example.com/audio/song${id}.mp3`,
              lyrics: request.lyrics || ""
            } 
          : request
      ));
      
      setUploadingAudio(false);
      
      toast.success("Audio Uploaded", {
        description: "Custom song has been completed and is ready for delivery."
      });
    }, 1500);
  };

  return {
    songRequests,
    selectedRequest,
    lyricsDraft,
    uploadingAudio,
    setLyricsDraft,
    handleStartWork,
    handleWriteLyrics,
    handleSaveLyrics,
    handleUploadAudio,
    handleRecreateLyrics,
    setSelectedRequest
  };
};
