
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Producer } from '@/types/producer';
import { Song } from '@/types/song';
import { ProducerCard } from './ProducerCard';
import { VoiceRecorder } from './VoiceRecorder';
import { useProducers } from '@/hooks/useProducers';
import { useReproductionRequests } from '@/hooks/useReproductionRequests';
import { Upload, Music } from 'lucide-react';

interface ReproduceTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song;
}

export const ReproduceTrackDialog = ({ open, onOpenChange, song }: ReproduceTrackDialogProps) => {
  const [step, setStep] = useState<'track' | 'record' | 'producer' | 'details'>('track');
  const [selectedTrack, setSelectedTrack] = useState<Song | null>(song || null);
  const [uploadedTrackUrl, setUploadedTrackUrl] = useState('');
  const [vocalRecordingUrl, setVocalRecordingUrl] = useState('');
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [priceCredits, setPriceCredits] = useState(1000);

  const { producers, loading: producersLoading } = useProducers();
  const { createRequest, loading: submitting } = useReproductionRequests();

  const handleTrackSelection = () => {
    if (selectedTrack || uploadedTrackUrl) {
      setStep('record');
    }
  };

  const handleRecordingComplete = (audioUrl: string) => {
    setVocalRecordingUrl(audioUrl);
    setStep('producer');
  };

  const handleProducerSelect = (producer: Producer) => {
    setSelectedProducer(producer);
    setPriceCredits(producer.min_price_credits);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedProducer || !vocalRecordingUrl || !trackTitle) return;

    const success = await createRequest({
      producer_id: selectedProducer.id,
      track_id: selectedTrack?.id,
      uploaded_track_url: uploadedTrackUrl || undefined,
      user_vocal_recording_url: vocalRecordingUrl,
      track_title,
      special_instructions: specialInstructions || undefined,
      price_credits: priceCredits
    });

    if (success) {
      onOpenChange(false);
      // Reset form
      setStep('track');
      setSelectedTrack(song || null);
      setUploadedTrackUrl('');
      setVocalRecordingUrl('');
      setSelectedProducer(null);
      setTrackTitle('');
      setSpecialInstructions('');
      setPriceCredits(1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reproduce Track with Human Touch</DialogTitle>
        </DialogHeader>

        {step === 'track' && (
          <div className="space-y-6">
            <Tabs defaultValue={song ? 'library' : 'upload'}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="library">From Library</TabsTrigger>
                <TabsTrigger value="upload">Upload Track</TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="space-y-4">
                {song && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Music className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">{song.title}</h3>
                        <p className="text-sm text-muted-foreground">Selected from library</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div>
                  <Label htmlFor="track-url">Track URL</Label>
                  <Input
                    id="track-url"
                    value={uploadedTrackUrl}
                    onChange={(e) => setUploadedTrackUrl(e.target.value)}
                    placeholder="Paste the URL of your AI-generated track"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={handleTrackSelection}
              disabled={!selectedTrack && !uploadedTrackUrl}
              className="w-full"
            >
              Continue to Recording
            </Button>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Record Your Vocals</h3>
              <p className="text-muted-foreground">
                Record your vocals live through the platform to ensure originality and legal safety.
              </p>
            </div>

            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          </div>
        )}

        {step === 'producer' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Select a Producer</h3>
            
            {producersLoading ? (
              <div className="text-center py-8">Loading producers...</div>
            ) : producers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No producers available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {producers.map((producer) => (
                  <ProducerCard
                    key={producer.id}
                    producer={producer}
                    onSelect={handleProducerSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'details' && selectedProducer && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Request Details</h3>
              <p className="text-muted-foreground">
                Selected producer: {selectedProducer.business_name || selectedProducer.profile?.full_name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="track-title">Track Title *</Label>
                <Input
                  id="track-title"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="Enter the title for your track"
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Price (Credits)</Label>
                <Input
                  id="price"
                  type="number"
                  value={priceCredits}
                  onChange={(e) => setPriceCredits(Number(e.target.value))}
                  min={selectedProducer.min_price_credits}
                  max={selectedProducer.max_price_credits}
                />
                <p className="text-sm text-muted-foreground">
                  ${(priceCredits * 0.01).toFixed(2)} USD 
                  (Range: ${(selectedProducer.min_price_credits * 0.01).toFixed(0)} - ${(selectedProducer.max_price_credits * 0.01).toFixed(0)})
                </p>
              </div>

              <div>
                <Label htmlFor="instructions">Special Instructions</Label>
                <Textarea
                  id="instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any specific requirements or notes for the producer..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('producer')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!trackTitle || submitting}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : `Submit Request (${priceCredits} credits)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
