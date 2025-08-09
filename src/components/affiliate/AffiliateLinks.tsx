
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
      // Get affiliate application to get the referral code
      const { data: application, error: appError } = await supabase
        .from('affiliate_applications')
        .select('unique_referral_code, status')
        .eq('user_id', affiliateId)
        .eq('status', 'approved')
        .single();

      if (appError || !application) {
        console.error('No approved affiliate application found:', appError);
        setLinks([]);
        return;
      }

      // Check if link already exists
      let { data: existingLinks, error: linkError } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_user_id', affiliateId);

      if (linkError) {
        console.error('Error fetching affiliate links:', linkError);
        return;
      }

      // If no links exist, create one
      if (!existingLinks || existingLinks.length === 0) {
        const { data: newLink, error: createError } = await supabase
          .from('affiliate_links')
          .insert({
            affiliate_user_id: affiliateId,
            link_code: application.unique_referral_code,
            clicks_count: 0
          })
          .select()
          .single();

        if (!createError && newLink) {
          setLinks([newLink]);
        } else {
          console.error('Error creating affiliate link:', createError);
          setLinks([]);
        }
      } else {
        setLinks(existingLinks);
      }
    } catch (err) {
      console.error('Error fetching links:', err);
      toast.error('Failed to load affiliate links');
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-4">
            No affiliate links found. This may be because your application is still pending or was rejected.
          </p>
          <div className="text-center">
            <Button onClick={fetchLinks} variant="outline">
              Refresh Links
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.map((link) => {
          const fullLink = generateReferralLink(link.link_code);
          return (
            <div key={link.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Link Code: {link.link_code}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <BarChart className="mr-1 h-4 w-4" />
                    {link.clicks_count} clicks
                  </div>
                </div>
                <Button
                  variant="outline"
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
                  className="flex-1 bg-gray-50 text-sm"
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AffiliateLinks;
