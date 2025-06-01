import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Music, Disc, Trophy, Plus, Clock, Star, Play, Pause, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SplitAudioControl from "@/components/SplitAudioControl";
import { useSongStatusChecker } from "@/hooks/use-song-status-checker";

interface Song {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'rejected' | 'approved';
  created_at: string;
  audio_url?: string;
  type: 'song' | 'instrumental';
  lyrics?: string;
  vocal_url?: string;
  instrumental_url?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Use the enhanced status checker
  useSongStatusChecker();

  const fetchRecentSongs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, status, created_at, audio_url, type, lyrics, vocal_url, instrumental_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching songs:', error);
        return;
      }

      setRecentSongs(data || []);
    } catch (error) {
      console.error('Error fetching recent songs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSongs();
    
    // Set up real-time updates for songs
    const channel = supabase
      .channel('songs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'songs',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('Song updated, refreshing list');
          fetchRecentSongs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clean up audio elements
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [user]);

  const handlePlaySong = async (song: Song) => {
    // Check if song is ready for playback
    if (song.status !== 'completed') {
      toast.error('Song is not ready for playback yet');
      return;
    }

    if (!song.audio_url) {
      toast.error('No audio URL available');
      return;
    }

    // Check if audio_url is an error message
    if (song.audio_url.startsWith('error:')) {
      toast.error('This song failed to generate. Please try creating a new one.');
      return;
    }

    // For Suno songs, audio_url should be a direct HTTP URL after completion
    if (!song.audio_url.startsWith('http')) {
      toast.error('Audio file is not ready yet. Please wait for generation to complete.');
      return;
    }

    try {
      // Stop any currently playing audio
      if (currentlyPlaying && audioElements.has(currentlyPlaying)) {
        const currentAudio = audioElements.get(currentlyPlaying);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // If clicking the same song that's playing, just pause it
      if (currentlyPlaying === song.id) {
        setCurrentlyPlaying(null);
        return;
      }

      let audio = audioElements.get(song.id);
      
      if (!audio) {
        console.log('Creating new audio element for:', song.audio_url);
        audio = new Audio();
        
        // Set up event listeners
        audio.addEventListener('ended', () => {
          setCurrentlyPlaying(null);
          toast.success('Song finished playing');
        });
        
        audio.addEventListener('error', (e) => {
          console.error('Audio error:', e);
          console.error('Failed audio URL:', song.audio_url);
          toast.error('Failed to play audio - the file may be corrupted or temporarily unavailable');
          setCurrentlyPlaying(null);
        });

        audio.addEventListener('loadstart', () => {
          console.log('Audio loading started for:', song.title);
        });

        audio.addEventListener('canplay', () => {
          console.log('Audio can play:', song.title);
        });

        audio.addEventListener('loadeddata', () => {
          console.log('Audio data loaded for:', song.title);
        });
        
        setAudioElements(prev => new Map(prev.set(song.id, audio!)));
      }

      // Set the source and play
      audio.src = song.audio_url;
      console.log('Playing audio from URL:', song.audio_url);
      
      // Add crossOrigin attribute to handle CORS
      audio.crossOrigin = 'anonymous';
      
      await audio.play();
      setCurrentlyPlaying(song.id);
      toast.success(`Now playing: ${song.title}`);
      
    } catch (error: any) {
      console.error('Error playing song:', error);
      console.error('Song details:', song);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        toast.error('Please interact with the page first, then try playing the song again');
      } else if (error.name === 'NotSupportedError') {
        toast.error('This audio format is not supported by your browser');
      } else if (error.name === 'AbortError') {
        toast.error('Audio playback was interrupted');
      } else {
        toast.error('Failed to play audio: ' + error.message);
      }
      setCurrentlyPlaying(null);
    }
  };

  const handleDownloadSong = async (song: Song) => {
    if (song.status !== 'completed') {
      toast.error('Song is not ready for download yet');
      return;
    }

    if (!song.audio_url || !song.audio_url.startsWith('http')) {
      toast.error('Audio file is not available for download');
      return;
    }

    if (song.audio_url.startsWith('error:')) {
      toast.error('Cannot download failed song');
      return;
    }

    if (downloadingIds.has(song.id)) {
      toast.info('Download already in progress');
      return;
    }

    try {
      setDownloadingIds(prev => new Set(prev.add(song.id)));
      toast.info('Starting download...');
      
      console.log('Downloading from URL:', song.audio_url);
      
      // Use fetch with proper headers to download the file
      const response = await fetch(song.audio_url, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      console.log('Download successful, blob size:', blob.size);

      // Create download link
      const sanitizedTitle = song.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      const fileName = `${sanitizedTitle}_${song.type}.mp3`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast.success(`Downloaded: ${fileName}`);
      
    } catch (error: any) {
      console.error('Download error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('CORS')) {
        toast.error('Download blocked by CORS policy. The audio provider may not allow direct downloads.');
      } else if (error.message.includes('NetworkError')) {
        toast.error('Network error during download. Please check your connection and try again.');
      } else {
        toast.error('Failed to download: ' + error.message);
      }
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(song.id);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'pending':
        return 'Generating...';
      case 'rejected':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading your library...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to MelodyMagic</h1>
          <p className="text-muted-foreground">Please log in to view your songs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground">Create, share, and discover AI-generated music</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-3 rounded-lg">
          <div className="text-sm text-muted-foreground mr-2">Available Credits:</div>
          <div className="flex items-center gap-1 text-melody-secondary font-bold">
            <Star size={16} className="fill-melody-secondary" />
            <span>{user?.credits}</span>
          </div>
          <Link to="/credits">
            <Button size="sm" variant="outline" className="ml-2">
              Get More
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/create">
          <Card className="music-card h-48 bg-gradient-to-br from-melody-primary to-melody-primary/60">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Plus size={40} className="mb-4" />
              <h2 className="text-xl font-bold mb-2">Create New Song</h2>
              <p className="text-sm text-muted-foreground">
                Generate songs or instrumentals with AI
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/library">
          <Card className="music-card h-48">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Music size={40} className="mb-4 text-melody-secondary" />
              <h2 className="text-xl font-bold mb-2">My Library</h2>
              <p className="text-sm text-muted-foreground">
                Access your saved songs and creations
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/contest">
          <Card className="music-card h-48">
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Trophy size={40} className="mb-4 text-melody-accent" />
              <h2 className="text-xl font-bold mb-2">Contest</h2>
              <p className="text-sm text-muted-foreground">
                Join our music contests and win prizes
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recent Tracks</h2>
          <Link to="/library">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="music-card animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-200"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentSongs.length === 0 ? (
          <Card className="music-card">
            <CardContent className="p-12 text-center">
              <Music className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No songs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI-generated song to get started!
              </p>
              <Link to="/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Song
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentSongs.map((song) => (
              <Card key={song.id} className="music-card">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-melody-primary/30 to-melody-secondary/30 flex items-center justify-center relative group">
                    <Disc className="h-12 w-12 text-melody-secondary/70" />
                    
                    {song.status === 'completed' && song.audio_url?.startsWith('http') && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-12 w-12 rounded-full bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePlaySong(song);
                          }}
                        >
                          {currentlyPlaying === song.id ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-1" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="lg"
                          className="h-12 w-12 rounded-full bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDownloadSong(song);
                          }}
                          disabled={downloadingIds.has(song.id)}
                        >
                          {downloadingIds.has(song.id) ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                          ) : (
                            <Download className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    )}

                    {song.status === 'rejected' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-red-500 text-center">
                          <div className="text-2xl mb-1">❌</div>
                          <div className="text-xs">Failed</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold truncate">{song.title}</h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(song.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">
                        {song.type === 'instrumental' ? 'Instrumental' : 'Song'} • AI Generated
                      </div>
                      <span className={`text-xs font-medium ${getStatusColor(song.status)}`}>
                        {getStatusText(song.status)}
                      </span>
                    </div>
                    
                    {/* Show lyrics preview if available */}
                    {song.lyrics && song.status === 'completed' && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <div className="font-medium mb-1">Lyrics:</div>
                        <div className="text-muted-foreground line-clamp-2">
                          {song.lyrics.substring(0, 100)}...
                        </div>
                      </div>
                    )}
                    
                    {/* Split Audio Control */}
                    {song.status === 'completed' && song.audio_url?.startsWith('http') && (
                      <div className="mt-2">
                        <SplitAudioControl 
                          songName={song.title}
                          songUrl={song.audio_url}
                        />
                      </div>
                    )}
                    
                    {song.status === 'pending' && (
                      <div className="audio-wave mt-2">
                        <div className="audio-wave-bar h-3 animate-wave1"></div>
                        <div className="audio-wave-bar h-5 animate-wave2"></div>
                        <div className="audio-wave-bar h-2 animate-wave3"></div>
                        <div className="audio-wave-bar h-4 animate-wave4"></div>
                        <div className="audio-wave-bar h-2 animate-wave1"></div>
                        <div className="audio-wave-bar h-5 animate-wave2"></div>
                      </div>
                    )}
                    
                    {currentlyPlaying === song.id && (
                      <div className="mt-2 text-xs text-melody-primary font-medium">
                        ♪ Now Playing
                      </div>
                    )}

                    {song.status === 'rejected' && (
                      <div className="mt-2 text-xs text-red-500">
                        Generation failed. Please try again.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
