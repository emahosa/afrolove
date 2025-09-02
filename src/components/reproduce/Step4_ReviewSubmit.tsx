import React from 'react';
import { ReproductionRequestData } from '@/pages/ReproduceTrack';

interface Props {
  onBack: () => void;
  requestData: ReproductionRequestData;
}

export const Step4_ReviewSubmit: React.FC<Props> = ({ onBack, requestData }) => {
  const handleSubmit = () => {
    // TODO: Implement the call to the create_reproduction_request RPC
    alert('Submitting request...');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 4: Review and Submit</h2>
      <p className="mb-4">Please review the details of your request before submitting. Credits will be deducted from your account and held in escrow.</p>
      {/* TODO: Display a summary of the requestData */}
      <div className="flex justify-between">
        <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded">Back</button>
        <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">Confirm & Submit Request</button>
      </div>
    </div>
  );
};
