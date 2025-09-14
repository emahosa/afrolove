import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const TermsAndConditions = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('terms_and_conditions')
          .select('content')
          .single();

        if (error) {
          if (error.message.includes('relation "public.terms_and_conditions" does not exist')) {
            setTableMissing(true);
          } else {
            throw error;
          }
        }

        if (data) {
          setContent(data.content);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">Loading...</span>
        </div>
      );
    }

    if (tableMissing) {
      if (isAdmin()) {
        return (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Admin Notice: Setup Required</AlertTitle>
            <AlertDescription>
              The 'Terms and Conditions' page has not been set up yet. Please navigate to the{' '}
              <Link to="/admin?tab=content&subtab=terms" className="font-semibold text-primary hover:underline">
                Content Management
              </Link>
              {' '}section in the admin dashboard to create and publish the terms.
            </AlertDescription>
          </Alert>
        );
      }
      return (
        <div className="text-center py-10">
          <p>The Terms and Conditions are not available at the moment. Please check back later.</p>
        </div>
      );
    }

    if (error) {
      return <div className="text-red-500">{error}</div>;
    }

    return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
  };

  return (
    <div className="p-4 md:p-8 text-white">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsAndConditions;
