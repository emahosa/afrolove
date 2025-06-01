
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { BottomAudioPlayer } from "@/components/song-management/BottomAudioPlayer";

interface PlayingRequest {
  id: string;
  title: string;
  type?: 'suno' | 'custom';
}

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPlayingRequest, setCurrentPlayingRequest] = useState<PlayingRequest | null>(null);
  const [showBottomPlayer, setShowBottomPlayer] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);

  const handlePlay = (request: PlayingRequest) => {
    console.log('AppLayout: Handling play request:', request);
    setCurrentPlayingRequest(request);
    setShowBottomPlayer(true);
  };

  const handleClosePlayer = () => {
    console.log('AppLayout: Closing audio player');
    setShowBottomPlayer(false);
    setCurrentPlayingRequest(null);
  };

  // Listen for audio player events from child components
  useEffect(() => {
    const handleAudioPlayerPlay = (event: Event) => {
      console.log('AppLayout: Received audio player event:', event);
      const customEvent = event as CustomEvent<PlayingRequest>;
      console.log('AppLayout: Event detail:', customEvent.detail);
      if (customEvent.detail) {
        handlePlay(customEvent.detail);
      }
    };

    console.log('AppLayout: Adding event listener for audioPlayerPlay');
    window.addEventListener('audioPlayerPlay', handleAudioPlayerPlay);

    return () => {
      console.log('AppLayout: Removing event listener for audioPlayerPlay');
      window.removeEventListener('audioPlayerPlay', handleAudioPlayerPlay);
    };
  }, []);

  const handleDownloadAudio = async (targetRequest?: PlayingRequest) => {
    const requestToDownload = targetRequest || currentPlayingRequest;
    if (!requestToDownload) return;

    try {
      setDownloadingAudio(true);
      console.log('AppLayout: Starting download for:', requestToDownload);

      const { supabase } = await import("@/integrations/supabase/client");
      const { toast } = await import("sonner");

      if (requestToDownload.type === 'suno') {
        // For Suno songs, get the audio URL directly from the songs table
        const { data: songData, error: songError } = await supabase
          .from('songs')
          .select('audio_url, title')
          .eq('id', requestToDownload.id)
          .single();

        if (songError || !songData?.audio_url) {
          console.error('AppLayout: Error fetching Suno song:', songError);
          toast.error('Failed to fetch song data');
          return;
        }

        // Download the Suno song
        const response = await fetch(songData.audio_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const sanitizedTitle = songData.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const fileName = `${sanitizedTitle}_suno_song.mp3`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);

        toast.success('Suno song downloaded successfully!');
      } else {
        // For custom songs, use the existing logic
        const { data: audioData, error: audioError } = await supabase
          .from('custom_song_audio')
          .select('*')
          .eq('request_id', requestToDownload.id)
          .order('created_at', { ascending: false });

        if (audioError) {
          console.error('AppLayout: Database error:', audioError);
          toast.error('Failed to fetch audio data: ' + audioError.message);
          return;
        }

        if (!audioData || audioData.length === 0) {
          console.error('AppLayout: No audio records found for request:', requestToDownload.id);
          toast.error('No audio files found for this request. Please contact support if this seems incorrect.');
          return;
        }

        let audioRecord = audioData.find(record => record.is_selected === true);
        if (!audioRecord) {
          audioRecord = audioData[0];
        }

        if (!audioRecord?.audio_url) {
          console.error('AppLayout: Audio record missing URL:', audioRecord);
          toast.error('Audio file URL is missing');
          return;
        }

        const response = await fetch(audioRecord.audio_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }

        const sanitizedTitle = requestToDownload.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const fileName = `${sanitizedTitle}_custom_song.mp3`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);

        toast.success('Audio file downloaded successfully!');
      }
      
    } catch (error: any) {
      console.error('AppLayout: Download error:', error);
      const { toast } = await import("sonner");
      toast.error('Failed to download audio file: ' + error.message);
    } finally {
      setDownloadingAudio(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      
      {showBottomPlayer && currentPlayingRequest && (
        <BottomAudioPlayer
          requestId={currentPlayingRequest.id}
          title={currentPlayingRequest.title}
          type={currentPlayingRequest.type}
          isVisible={showBottomPlayer}
          onClose={handleClosePlayer}
          onDownload={() => handleDownloadAudio(currentPlayingRequest)}
          downloadingAudio={downloadingAudio}
        />
      )}
    </div>
  );
};

export default AppLayout;
