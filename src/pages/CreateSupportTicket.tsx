
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CreateSupportTicket = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Create Support Ticket</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Support Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Support ticket creation form goes here.</p>
          <Button className="mt-4">Create Ticket</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSupportTicket;
