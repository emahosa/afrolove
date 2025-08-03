
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SupportTicketDetail = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Support Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Ticket ID: {id}</p>
          <p>Ticket details will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTicketDetail;
