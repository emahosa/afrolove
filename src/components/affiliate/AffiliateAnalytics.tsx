
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Users, CheckCircle, XCircle, Star } from 'lucide-react';

interface AffiliateAnalyticsProps {
  affiliateId: string;
}

interface AnalyticsData {
  totalReferrals: number;
  validReferrals: number;
  invalidReferrals: number;
  subscribedReferrals: number;
  activeFreeReferrals: number;
}

const AffiliateAnalytics: React.FC<AffiliateAnalyticsProps> = ({ affiliateId }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalReferrals: 0,
    validReferrals: 0,
    invalidReferrals: 0,
    subscribedReferrals: 0,
    activeFreeReferrals: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-affiliate-data', {
        body: { type: 'analytics', userId: affiliateId }
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        return;
      }

      if (data?.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchAnalytics();
    }
  }, [affiliateId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" /> Affiliate Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" /> Affiliate Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-blue-600">Total Referrals</h3>
            <p className="text-2xl font-bold text-blue-700">{analytics.totalReferrals}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-green-600">Valid Referrals</h3>
            <p className="text-2xl font-bold text-green-700">{analytics.validReferrals}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-red-600">Invalid Referrals</h3>
            <p className="text-2xl font-bold text-red-700">{analytics.invalidReferrals}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-purple-600">Subscribed Referrals</h3>
            <p className="text-2xl font-bold text-purple-700">{analytics.subscribedReferrals}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-orange-600">Active Free Referrals</h3>
            <p className="text-2xl font-bold text-orange-700">{analytics.activeFreeReferrals}</p>
          </div>
        </div>
        
        {analytics.invalidReferrals > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Invalid referrals occur when users share the same IP address or device. 
              These referrals are registered but don't generate earnings to prevent fraudulent activity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AffiliateAnalytics;
