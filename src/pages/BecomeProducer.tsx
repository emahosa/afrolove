import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const formSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  idDocument: z.instanceof(FileList).refine(files => files?.length === 1, 'ID Document is required.'),
});

const BecomeProducer: React.FC = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instagram: '',
      tiktok: '',
      youtube: '',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      form.setValue('idDocument', event.target.files);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error('You must be logged in to apply.');
      return;
    }

    setIsSubmitting(true);
    toast.info('Submitting your application...');

    try {
      // 1. Upload the ID document
      const file = values.idDocument[0];
      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('producer-id-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Failed to upload ID: ${uploadError.message}`);
      }

      // 2. This is a private bucket, so we can't get a public URL.
      // We will store the path and construct the URL when needed, or use signed URLs.
      // For now, storing the path is sufficient for the backend function to reference.
      const id_document_url = filePath;

      // 3. Submit the application to the backend function
      const social_media_links = {
        instagram: values.instagram,
        tiktok: values.tiktok,
        youtube: values.youtube,
      };

      const { error: functionError } = await supabase.functions.invoke('submit-producer-application', {
        body: {
          social_media_links,
          id_document_url: id_document_url,
        },
      });

      if (functionError) {
        // Attempt to clean up the uploaded file if submission fails
        await supabase.storage.from('producer-id-documents').remove([filePath]);
        throw new Error(`Application failed: ${functionError.message}`);
      }

      toast.success('Application submitted successfully!');
      form.reset();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Become a Producer</CardTitle>
          <CardDescription>
            Apply to become a verified producer on our platform. Show us your work and get approved to take on user requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Profile URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/yourprofile" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok Profile URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@yourprofile" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Channel URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/c/yourchannel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idDocument"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Government-Issued ID</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BecomeProducer;
