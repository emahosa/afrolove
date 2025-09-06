
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link as LinkIcon, Copy, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { AffiliateLink } from '@/types/affiliate';

interface AffiliateLinksProps {
  affiliateId: string;
}

const AffiliateLinks: React.FC<AffiliateLinksProps> = ({ affiliateId }) => {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    try {
      // First try to get existing links
      let { data, error } = await supabase
        .rpc('get_affiliate_links', { user_id: affiliateId });

      if (error) {
        console.error('Error fetching affiliate links:', error);
        return;
      }

      // If no links exist but user is approved, create one
      if (!data || data.length === 0) {
        const { data: applicationData } = await supabase
          .from('affiliate_applications')
          .select('unique_referral_code, status')
          .eq('user_id', affiliateId)
          .eq('status', 'approved')
          .single();

        if (applicationData?.unique_referral_code) {
          // Create the affiliate link
          const { data: newLink, error: createError } = await supabase
            .from('affiliate_links')
            .insert({
              affiliate_user_id: affiliateId,
              link_code: applicationData.unique_referral_code,
              clicks_count: 0
            })
            .select()
            .single();

          if (!createError && newLink) {
            setLinks([{
              id: newLink.id,
              affiliate_user_id: newLink.affiliate_user_id,
              link_code: newLink.link_code,
              clicks_count: newLink.clicks_count,
              created_at: newLink.created_at,
              updated_at: newLink.updated_at
            }]);
          }
        }
      } else {
        setLinks(data);
      }
    } catch (err) {
      console.error('Error fetching links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchLinks();
    }
  }, [affiliateId]);

  const generateReferralLink = (linkCode: string) => {
    return `${window.location.origin}/register?ref=${linkCode}`;
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => toast.success("Referral link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy referral link."));
  };

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No affiliate links found. Links are generated when your application is approved.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.map((link) => {
          const fullLink = generateReferralLink(link.link_code);
          return (
            <Card key={link.id} variant="glass">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Link Code: {link.link_code}</p>
                    <div className="flex items-center text-sm text-gray-400">
                      <BarChart className="mr-1 h-4 w-4" />
                      {link.clicks_count} clicks
                    </div>
                  </div>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => copyToClipboard(fullLink)}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    value={fullLink}
                    readOnly
                    className="flex-1 bg-black/20 border-white/20 text-white placeholder-gray-500"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AffiliateLinks;
