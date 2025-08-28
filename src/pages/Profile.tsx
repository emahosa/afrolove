
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, Camera, User, Mail, CreditCard } from 'lucide-react';

const Profile = () => {
  const { user, userRoles, isAdmin, isSuperAdmin, isSubscriber, isVoter } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.name || '',
        username: user.email || '',
        avatar_url: user.avatar || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('profile_images')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        avatar_url: data.publicUrl,
      }));

      toast.success('Image uploaded successfully!');
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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          avatar_url: formData.avatar_url,
        })
        .eq('id', user.id);

      if (error) throw error;

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

  const getSubscriptionStatus = () => {
    if (!user?.subscription) return 'No active subscription';
    
    const subscription = user.subscription;
    if (subscription.status === 'active') {
      return `Active - ${subscription.planId}`;
    }
    
    return `${subscription.status} - ${subscription.planId || 'Unknown'}`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 text-white">
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Avatar className="h-20 w-20 border-2 border-dark-purple">
          <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
          <AvatarFallback className="bg-black/20">
            <User className="h-10 w-10 text-dark-purple" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-semibold text-white">{formData.full_name || 'User Profile'}</h1>
          <p className="text-gray-400">Manage your account settings</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-dark-purple" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="avatar" className="text-gray-300">Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-dark-purple/50">
                      <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                      <AvatarFallback className="bg-black/20">
                        <User className="h-8 w-8 text-dark-purple" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploading}
                        className="bg-transparent border-white/30 hover:bg-white/10 text-white"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Change Picture
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-300">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="bg-black/20 border-white/20 text-white placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Email</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    disabled
                    className="bg-black/30 border-white/10 text-gray-400"
                  />
                  <p className="text-sm text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-dark-purple hover:bg-opacity-90 font-bold">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Status */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Mail className="h-5 w-5 text-dark-purple" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Role:</span>
                  <Badge className="bg-dark-purple text-white">{getUserRoleDisplay()}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Credits:</span>
                  <Badge variant="outline" className="border-white/20 text-gray-300">{user.credits || 0}</Badge>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-2">
                  <span className="text-sm font-medium">User Roles:</span>
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs border-white/20 text-gray-300">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-dark-purple" />
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge
                      className={user.subscription?.status === 'active' ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}
                    >
                      {getSubscriptionStatus()}
                    </Badge>
                  </div>

                  {user.subscription?.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Expires:</span>
                      <span className="text-sm text-gray-400">
                        {new Date(user.subscription.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
