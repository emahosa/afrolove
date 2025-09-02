import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProducerProfile {
  id: string;
  full_name: string;
  producer_settings: {
    price_per_track_credits: number;
  }[];
}

const fetchProducers = async (): Promise<ProducerProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      user_roles!inner(role),
      producer_settings!inner(price_per_track_credits)
    `)
    .eq('user_roles.role', 'producer');

  if (error) throw new Error(error.message);
  return data as ProducerProfile[];
};

interface Props {
  onNext: () => void;
  onBack: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
  requestData: ReproductionRequestData;
}

export const Step3_SelectProducer: React.FC<Props> = ({ onNext, onBack, updateRequestData }) => {
  const { data: producers, isLoading, error } = useQuery({
    queryKey: ['producers'],
    queryFn: fetchProducers,
  });
  const [selectedProducer, setSelectedProducer] = useState<ProducerProfile | null>(null);

  const handleSelect = (producer: ProducerProfile) => {
    setSelectedProducer(producer);
  };

  const handleNext = () => {
      if (!selectedProducer) return;
      updateRequestData({
          producer: {
              id: selectedProducer.id,
              name: selectedProducer.full_name,
              price: selectedProducer.producer_settings[0].price_per_track_credits,
          }
      });
      onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 3: Choose a Producer</h2>
      <p className="text-muted-foreground mb-6">Select a verified producer to humanize your track. You can filter by price later.</p>

      {isLoading && <Loader2 className="h-8 w-8 animate-spin mx-auto" />}
      {error && <Alert variant="destructive"><AlertTitle>Error fetching producers</AlertTitle><AlertDescription>{(error as Error).message}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {producers?.map(producer => (
          <Card
            key={producer.id}
            className={`cursor-pointer transition-all ${selectedProducer?.id === producer.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => handleSelect(producer)}
          >
            <CardHeader>
              <CardTitle>{producer.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-bold text-lg">{producer.producer_settings[0].price_per_track_credits} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button onClick={handleNext} disabled={!selectedProducer}>Next</Button>
      </div>
    </div>
  );
};
