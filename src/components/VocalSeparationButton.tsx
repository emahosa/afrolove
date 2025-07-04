
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Music, Mic } from 'lucide-react';
import { useVocalSeparation } from '@/hooks/useVocalSeparation';
import { Badge } from '@/components/ui/badge';

interface VocalSeparationButtonProps {
  songId: string;
  taskId: string;
  audioId: string;
  songTitle?: string;
  instrumentalUrl?: string;
  vocalUrl?: string;
  originalUrl?: string;
  vocalSeparationStatus?: string;
}

export const VocalSeparationButton = ({ 
  songId, 
  taskId, 
  audioId, 
  songTitle = 'song',
  instrumentalUrl,
  vocalUrl,
  originalUrl,
  vocalSeparationStatus 
}: VocalSeparationButtonProps) => {
  const { startVocalSeparation, downloadVocalSeparationFiles, loading, status } = useVocalSeparation();
  const [localStatus, setLocalStatus] = useState(vocalSeparationStatus || 'not_started');

  const handleStartSeparation = async () => {
    const result = await startVocalSeparation(taskId, audioId);
    if (result.success) {
      setLocalStatus('processing');
    }
  };

  const handleDownload = async () => {
    if (instrumentalUrl && vocalUrl && originalUrl) {
      await downloadVocalSeparationFiles(instrumentalUrl, vocalUrl, originalUrl, songTitle);
    }
  };

  const getStatusBadge = () => {
    switch (localStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-white">Ready</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      );
    }

    if (localStatus === 'completed' && instrumentalUrl && vocalUrl) {
      return (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Separated
        </>
      );
    }

    if (localStatus === 'processing') {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      );
    }

    return (
      <>
        <Music className="h-4 w-4 mr-2" />
        <Mic className="h-4 w-4 mr-2" />
        Separate Vocals
      </>
    );
  };

  const isDisabled = loading || localStatus === 'processing';
  const onClick = localStatus === 'completed' && instrumentalUrl && vocalUrl 
    ? handleDownload 
    : handleStartSeparation;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isDisabled}
        className="text-xs"
      >
        {getButtonContent()}
      </Button>
      {getStatusBadge()}
    </div>
  );
};
