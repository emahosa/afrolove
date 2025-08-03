
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ContestDetail = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Contest Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Contest ID: {id}</p>
          <p>Contest details will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContestDetail;
