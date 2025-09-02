import React, { useState, useRef } from 'react';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mic, StopCircle, Play, Loader2 } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
}

export const Step2_RecordVocal: React.FC<Props> = ({ onNext, onBack, updateRequestData }) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        chunks.current = [];
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      toast.error('Could not access microphone. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleUploadAndNext = async () => {
      if (!audioBlob || !user) return;

      setIsUploading(true);
      toast.info("Uploading your vocal recording...");

      try {
          const filePath = `${user.id}/vocal-${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
              .from('vocal-recordings')
              .upload(filePath, audioBlob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
              .from('vocal-recordings')
              .getPublicUrl(filePath);

          if (!publicUrl) throw new Error("Could not get public URL for recording.");

          toast.success("Recording uploaded successfully!");
          updateRequestData({ vocalRecordingUrl: publicUrl });
          onNext();
      } catch (error) {
          toast.error((error as Error).message);
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 2: Record Your Vocals</h2>
      <p className="mb-4 text-muted-foreground">Record your live vocals over the track. Please use headphones to prevent audio bleed. You can re-record as many times as you need.</p>

      <div className="flex flex-col items-center space-y-4 p-8 border rounded-lg">
        {!isRecording ? (
          <Button onClick={startRecording} size="lg">
            <Mic className="mr-2 h-6 w-6" /> Start Recording
          </Button>
        ) : (
          <Button onClick={stopRecording} size="lg" variant="destructive">
            <StopCircle className="mr-2 h-6 w-6" /> Stop Recording
          </Button>
        )}

        {audioUrl && (
            <div className="w-full flex flex-col items-center space-y-2">
                <p className="text-sm font-medium">Your Recording:</p>
                <audio src={audioUrl} controls className="w-full max-w-md" />
            </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button onClick={handleUploadAndNext} disabled={!audioBlob || isUploading}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Upload & Next
        </Button>
      </div>
    </div>
  );
};
