
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AffiliateEarning } from '@/types/affiliate';

interface EarningsBreakdownProps {
  affiliateId: string;
}

const EarningsBreakdown: React.FC<EarningsBreakdownProps> = ({ affiliateId }) => {
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-affiliate-data', {
        body: { type: 'earnings', userId: affiliateId }
      });

      if (error) {
        console.error('Error fetching earnings:', error);
        toast.error('Failed to load earnings data');
        return;
      }

      if (data?.earnings) {
        setEarnings(data.earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchEarnings();
    }
  }, [affiliateId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" /> Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5" /> Earnings Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {earnings.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No earnings yet</p>
            <p className="text-sm">Your earnings will appear here as you refer users</p>
          </div>
        ) : (
          earnings.map((earning) => (
            <div key={earning.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(earning.status)}
                <div>
                  <p className="font-medium">
                    {earning.earning_type === 'free_referral' ? 'Free Referral Bonus' : 'Subscription Commission'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {earning.profile?.full_name || earning.profile?.username || 'Anonymous User'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(earning.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">${Number(earning.amount).toFixed(2)}</p>
                <Badge className={getStatusColor(earning.status)}>
                  {earning.status.charAt(0).toUpperCase() + earning.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsBreakdown;
