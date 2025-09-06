import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { Label } from '@/components/ui/label';
import { CardTitle, CardDescription } from '@/components/ui/card';

export const SupportRequestForm = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createTicket } = useSupportTickets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await createTicket({ subject, message, priority });
      setSubject('');
      setMessage('');
      setPriority('medium');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <CardTitle>Submit a New Request</CardTitle>
      <CardDescription className="mb-6">We'll get back to you as soon as possible.</CardDescription>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Issue with song generation"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please describe your issue in detail..."
            rows={6}
            required
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>
    </div>
  );
};
