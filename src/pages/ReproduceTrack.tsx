import React, { useState } from 'react';
import { Step1_SelectTrack } from '@/components/reproduce/Step1_SelectTrack';
import { Step2_RecordVocal } from '@/components/reproduce/Step2_RecordVocal';
import { Step3_SelectProducer } from '@/components/reproduce/Step3_SelectProducer';
import { Step4_ReviewSubmit } from '@/components/reproduce/Step4_ReviewSubmit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';


export interface ReproductionRequestData {
  originalTrackUrl: string | null;
  vocalRecordingUrl: string | null;
  producer: { id: string; name: string; price: number } | null;
}

const ReproduceTrack: React.FC = () => {
  const [step, setStep] = useState(1);
  const [requestData, setRequestData] = useState<ReproductionRequestData>({
    originalTrackUrl: null,
    vocalRecordingUrl: null,
    producer: null,
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const updateRequestData = (data: Partial<ReproductionRequestData>) => {
    setRequestData(prev => ({ ...prev, ...data }));
  };

  const progressValue = (step / 4) * 100;
  const stepTitles = [
    "Select Track Source",
    "Record Your Vocals",
    "Choose a Producer",
    "Review and Submit"
  ];

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create a New Reproduction Request</CardTitle>
          <p className="text-muted-foreground">Step {step} of 4: {stepTitles[step - 1]}</p>
        </CardHeader>
        <CardContent className="p-6">
          <Progress value={progressValue} className="mb-8" />
          {step === 1 && (
            <Step1_SelectTrack
              onNext={nextStep}
              updateRequestData={updateRequestData}
            />
          )}
          {step === 2 && (
            <Step2_RecordVocal
              onNext={nextStep}
              onBack={prevStep}
              updateRequestData={updateRequestData}
            />
          )}
          {step === 3 && (
            <Step3_SelectProducer
              onNext={nextStep}
              onBack={prevStep}
              updateRequestData={updateRequestData}
              requestData={requestData}
            />
          )}
          {step === 4 && (
            <Step4_ReviewSubmit
              onBack={prevStep}
              requestData={requestData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReproduceTrack;
