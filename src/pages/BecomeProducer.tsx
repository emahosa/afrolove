
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerApplication } from '@/hooks/useProducers';
import { Upload, Music, DollarSign, Shield } from 'lucide-react';
import { toast } from 'sonner';

const BecomeProducer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submitApplication, loading } = useProducerApplication();

  const [formData, setFormData] = useState({
    business_name: '',
    social_media_links: {
      instagram: '',
      tiktok: '',
      youtube: ''
    },
    min_price_credits: 500,
    max_price_credits: 5000,
    portfolio_tracks: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    // Validate social media links
    const socialLinks = Object.values(formData.social_media_links).filter(link => link.trim());
    if (socialLinks.length === 0) {
      toast.error('Please provide at least one social media link');
      return;
    }

    const success = await submitApplication(formData);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Become a Producer</h1>
          <p className="text-muted-foreground mb-8">
            Please log in to apply as a producer.
          </p>
          <Button onClick={() => navigate('/login')}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Become a Producer</h1>
          <p className="text-muted-foreground">
            Join our platform as a verified producer and earn money by humanizing AI tracks
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Music className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Professional Work</h3>
              <p className="text-sm text-muted-foreground">
                Use your skills to humanize AI tracks with professional mixing and mastering
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Earn Money</h3>
              <p className="text-sm text-muted-foreground">
                Set your own rates and earn 60% of each completed project
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Secure Platform</h3>
              <p className="text-sm text-muted-foreground">
                Protected payments through our escrow system
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Producer Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="business-name">Business Name (Optional)</Label>
                <Input
                  id="business-name"
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Your studio or business name"
                />
              </div>

              <div className="space-y-4">
                <Label>Social Media Links *</Label>
                <p className="text-sm text-muted-foreground">
                  Provide links showing your studio work, face visible in videos, and production skills
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={formData.social_media_links.instagram}
                      onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      value={formData.social_media_links.tiktok}
                      onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                      placeholder="https://tiktok.com/@yourprofile"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      value={formData.social_media_links.youtube}
                      onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                      placeholder="https://youtube.com/c/yourchannel"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-price">Minimum Price (Credits)</Label>
                  <Input
                    id="min-price"
                    type="number"
                    value={formData.min_price_credits}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_price_credits: Number(e.target.value) }))}
                    min={100}
                    max={5000}
                  />
                  <p className="text-sm text-muted-foreground">
                    ${(formData.min_price_credits * 0.01).toFixed(2)} USD
                  </p>
                </div>

                <div>
                  <Label htmlFor="max-price">Maximum Price (Credits)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    value={formData.max_price_credits}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_price_credits: Number(e.target.value) }))}
                    min={formData.min_price_credits}
                    max={5000}
                  />
                  <p className="text-sm text-muted-foreground">
                    ${(formData.max_price_credits * 0.01).toFixed(2)} USD
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Application Requirements:</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Social media must show studio activity</li>
                    <li>• Your face must be visible in videos</li>
                    <li>• Demonstrate production skills</li>
                    <li>• Government-issued ID will be required upon approval</li>
                  </ul>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BecomeProducer;
