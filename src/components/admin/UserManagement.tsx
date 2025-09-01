
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, Edit, UserPlus, Ban, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

type UserRole = 'admin' | 'moderator' | 'user' | 'super_admin' | 'voter' | 'subscriber' | 'contest_entrant';

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  credits: number;
  is_suspended: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

interface UserWithRoles extends Profile {
  roles: UserRole[];
}

const availableRoles: UserRole[] = ['admin', 'moderator', 'user', 'super_admin', 'voter', 'subscriber', 'contest_entrant'];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Failed to fetch users');
        return;
      }

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        toast.error('Failed to fetch user roles');
        return;
      }

      // Combine profiles with their roles
      const usersWithRoles = profiles?.map(profile => {
        const roles = userRoles?.filter(role => role.user_id === profile.id).map(role => role.role as UserRole) || [];
        return {
          ...profile,
          roles
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoles: UserRole[]) => {
    try {
      // Remove all existing roles for the user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        toast.error('Failed to update user roles');
        return;
      }

      // Add new roles
      if (newRoles.length > 0) {
        const roleInserts = newRoles.map(role => ({
          user_id: userId,
          role: role as UserRole
        }));

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(roleInserts);

        if (insertError) {
          console.error('Error inserting new roles:', insertError);
          toast.error('Failed to update user roles');
          return;
        }
      }

      toast.success('User roles updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast.error('Failed to update user roles');
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user suspension:', error);
        toast.error('Failed to update user status');
        return;
      }

      toast.success(`User ${suspend ? 'suspended' : 'unsuspended'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user suspension:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user ban status:', error);
        toast.error('Failed to update user status');
        return;
      }

      toast.success(`User ${ban ? 'banned' : 'unbanned'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateCredits = async (userId: string, newCredits: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user credits:', error);
        toast.error('Failed to update user credits');
        return;
      }

      toast.success('User credits updated successfully');
      fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user credits:', error);
      toast.error('Failed to update user credits');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole as UserRole);
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:max-w-xs"
          />
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="md:max-w-xs">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {availableRoles.map(role => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground">{user.username || 'No username'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{user.credits}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                      {user.is_suspended && <Badge variant="secondary">Suspended</Badge>}
                      {!user.is_banned && !user.is_suspended && <Badge variant="default">Active</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setEditingUser(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          {editingUser && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="credits">Credits</Label>
                                <Input
                                  id="credits"
                                  type="number"
                                  defaultValue={editingUser.credits}
                                  onChange={(e) => {
                                    const newCredits = parseInt(e.target.value) || 0;
                                    setEditingUser({ ...editingUser, credits: newCredits });
                                  }}
                                />
                              </div>
                              
                              <div className="space-y-3">
                                <Label>Roles</Label>
                                {availableRoles.map(role => (
                                  <div key={role} className="flex items-center space-x-2">
                                    <Switch
                                      checked={editingUser.roles.includes(role)}
                                      onCheckedChange={(checked) => {
                                        const newRoles = checked 
                                          ? [...editingUser.roles, role]
                                          : editingUser.roles.filter(r => r !== role);
                                        setEditingUser({ ...editingUser, roles: newRoles });
                                      }}
                                    />
                                    <Label>{role.charAt(0).toUpperCase() + role.slice(1)}</Label>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={editingUser.is_suspended}
                                  onCheckedChange={(checked) => {
                                    setEditingUser({ ...editingUser, is_suspended: checked });
                                  }}
                                />
                                <Label>Suspended</Label>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={editingUser.is_banned}
                                  onCheckedChange={(checked) => {
                                    setEditingUser({ ...editingUser, is_banned: checked });
                                  }}
                                />
                                <Label>Banned</Label>
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button 
                                  onClick={() => {
                                    handleUpdateCredits(editingUser.id, editingUser.credits);
                                    handleRoleChange(editingUser.id, editingUser.roles);
                                    handleSuspendUser(editingUser.id, editingUser.is_suspended);
                                    handleBanUser(editingUser.id, editingUser.is_banned);
                                  }}
                                  className="flex-1"
                                >
                                  Save Changes
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setIsEditDialogOpen(false);
                                    setEditingUser(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspendUser(user.id, !user.is_suspended)}
                      >
                        {user.is_suspended ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No users found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
