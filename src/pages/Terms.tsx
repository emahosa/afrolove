import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

const Terms = () => {
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'terms_and_conditions')
          .single();

        if (error) throw error;

        if (data) {
          setTerms(data.value || '');
        }
      } catch (error: any) {
        console.error('Error fetching terms and conditions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  return (
    <div className="p-4 md:p-8 text-white">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{terms}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
