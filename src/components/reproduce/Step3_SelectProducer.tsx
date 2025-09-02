import React from 'react';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';

interface Props {
  onNext: () => void;
  onBack: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
  requestData: ReproductionRequestData;
}

export const Step3_SelectProducer: React.FC<Props> = ({ onNext, onBack, updateRequestData, requestData }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 3: Choose a Producer</h2>
      <p className="mb-4">Select a verified producer to humanize your track. You can filter by price.</p>
      {/* TODO: Implement fetching and displaying list of producers */}
      <div className="flex justify-between">
        <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded">Back</button>
        <button onClick={onNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  );
};
