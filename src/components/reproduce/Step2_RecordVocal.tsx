import React from 'react';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';

interface Props {
  onNext: () => void;
  onBack: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
}

export const Step2_RecordVocal: React.FC<Props> = ({ onNext, onBack, updateRequestData }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 2: Record Your Vocals</h2>
      <p className="mb-4">Record your live vocals over the track. Please use headphones to prevent audio bleed.</p>
      {/* TODO: Implement live vocal recording using MediaRecorder API */}
      <div className="flex justify-between">
        <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded">Back</button>
        <button onClick={onNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  );
};
