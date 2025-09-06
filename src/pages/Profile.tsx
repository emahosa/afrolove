import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Camera, User, Mail, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const ProfilePage = () => {
  const { user, userRoles, isAdmin, isSuperAdmin, isSubscriber, isVoter, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.user_metadata?.name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;

      setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl }
      });
      if (updateUserError) throw updateUserError;

      await refreshUser(); // Refresh user context to show new avatar immediately
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: formData.full_name }
      });
      if (error) throw error;

      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserRoleDisplay = () => {
    if (isSuperAdmin()) return 'Super Admin';
    if (isAdmin()) return 'Admin';
    if (isSubscriber()) return 'Subscriber';
    if (isVoter()) return 'Voter';
    return 'User';
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-white/10">
            <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
            <AvatarFallback className="bg-white/5 text-3xl"><User /></AvatarFallback>
          </Avatar>
           <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
             <Camera className="h-4 w-4" />
             <input type="file" id="avatar-upload" accept="image/*" onChange={handleImageUpload} className="hidden" />
           </label>
        </div>
        <div>
          <h1 className="text-4xl font-bold">{formData.full_name || 'User Profile'}</h1>
          <p className="text-white/70 mt-2">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-surface !p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3"><User /> Profile Information</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" value={user.email} disabled />
              </div>
              <Button type="submit" disabled={loading || uploading} className="w-full" size="lg">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="glass-surface !p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Mail /> Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-white/70">Role:</span><Badge variant="secondary">{getUserRoleDisplay()}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-white/70">Credits:</span><Badge variant="outline">{user.credits || 0}</Badge></div>
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <span className="text-sm text-white/70">User Roles:</span>
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}
                  </div>
                </div>
            </CardContent>
          </Card>

          <Card className="glass-surface !p-6">
             <CardHeader>
              <CardTitle className="flex items-center gap-3"><CreditCard /> Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Status:</span>
                <Badge variant={user.subscription?.status === 'active' ? "default" : "secondary"}>
                  {user.subscription?.status || 'Inactive'}
                </Badge>
              </div>
              {user.subscription?.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Expires:</span>
                  <span className="text-sm">{new Date(user.subscription.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
               <Button className="w-full" variant="secondary">Manage Subscription</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
