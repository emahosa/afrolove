
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { BottomAudioPlayer } from "@/components/song-management/BottomAudioPlayer";
import { AudioPlayerProvider, useAudioPlayerContext, PlayingRequest } from "@/contexts/AudioPlayerContext";

const AppLayoutContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const { showPlayer, currentTrack, closePlayer } = useAudioPlayerContext();

  const handleDownloadAudio = async (targetRequest?: PlayingRequest) => {
    const requestToDownload = targetRequest || currentTrack;
    if (!requestToDownload) return;

    try {
      setDownloadingAudio(true);
      console.log('AppLayout: Starting download for:', requestToDownload);

      const { supabase } = await import("@/integrations/supabase/client");
      const { toast } = await import("sonner");

      if (requestToDownload.type === 'suno') {
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
      
      {showPlayer && currentTrack && (
        <BottomAudioPlayer
          onClose={closePlayer}
          onDownload={() => handleDownloadAudio(currentTrack)}
          downloadingAudio={downloadingAudio}
        />
      )}
    </div>
  );
};

const AppLayout = () => {
  return (
    <AudioPlayerProvider>
      <AppLayoutContent />
    </AudioPlayerProvider>
  );
};

export default AppLayout;
