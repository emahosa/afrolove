
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';

export const SupportRequestForm = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createTicket } = useSupportTickets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createTicket({ subject, message, priority });
      setSubject('');
      setMessage('');
      setPriority('medium');
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-dark-purple" />
          Submit Support Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1 block">Priority</label>
            <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
              <SelectTrigger className="bg-black/20 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white">
                <SelectItem value="low" className="focus:bg-dark-purple">Low</SelectItem>
                <SelectItem value="medium" className="focus:bg-dark-purple">Medium</SelectItem>
                <SelectItem value="high" className="focus:bg-dark-purple">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1 block">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please describe your issue in detail..."
              rows={5}
              required
              className="bg-black/20 border-white/20 text-white placeholder-gray-500"
            />
          </div>
          
          <Button type="submit" disabled={isSubmitting} className="w-full bg-dark-purple hover:bg-opacity-90 font-bold">
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
