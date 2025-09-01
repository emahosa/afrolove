
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const AffiliateLinks = () => {
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Your Affiliate Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-gray-400 text-center py-8">
          <p>Affiliate links will appear here once your application is approved.</p>
          <p className="text-sm mt-2">Please complete your affiliate application first.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AffiliateLinks;
