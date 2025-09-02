import React from 'react';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';

interface Props {
  onNext: () => void;
  updateRequestData: (data: Partial<ReproductionRequestData>) => void;
}

export const Step1_SelectTrack: React.FC<Props> = ({ onNext, updateRequestData }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 1: Select Track Source</h2>
      <p className="mb-4">Choose a track from your library or upload one from your computer.</p>
      {/* TODO: Implement track selection from library and file upload */}
      <div className="flex justify-end">
        <button onClick={onNext} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
      </div>
    </div>
  );
};
