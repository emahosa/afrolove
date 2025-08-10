
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, Copy, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import { AffiliateLink } from '@/types/affiliate';

interface AffiliateLinksProps {
  links: AffiliateLink[];
}

const AffiliateLinks: React.FC<AffiliateLinksProps> = ({ links }) => {

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => toast.success("Referral link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy referral link."));
  };

  if (!links || links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5" /> Your Affiliate Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No affiliate links found.
          </p>
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
        {links.map((link) => (
          <div key={link.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Referral Code: {link.referral_code}</p>
                <div className="flex items-center text-sm text-gray-600">
                  <BarChart className="mr-1 h-4 w-4" />
                  {link.clicks_count} clicks
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(link.url)}
              >
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                value={link.url}
                readOnly
                className="flex-1 bg-gray-800 border-gray-700 text-gray-300 text-sm"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AffiliateLinks;
