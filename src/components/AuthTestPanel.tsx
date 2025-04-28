
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const AuthTestPanel = () => {
  const { user, isAdmin, session } = useAuth();
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id);
      
      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        setUserRoles(roles || []);
      }
      
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading user data...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Authentication Test Panel</CardTitle>
        <CardDescription>
          Testing authentication and role-based access control
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">User Status</h3>
          <p>Authenticated: {user ? "Yes" : "No"}</p>
          <p>User ID: {user?.id || "Not logged in"}</p>
          <p>Email: {user?.email || "Not logged in"}</p>
          <p>Is Admin (from context): {isAdmin() ? "Yes" : "No"}</p>
        </div>

        {userRoles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">User Roles</h3>
            <ul className="list-disc pl-5">
              {userRoles.map((roleData, index) => (
                <li key={index}>{roleData.role}</li>
              ))}
            </ul>
          </div>
        )}

        {userProfile && (
          <div>
            <h3 className="text-lg font-semibold">User Profile</h3>
            <p>Full Name: {userProfile.full_name}</p>
            <p>Username: {userProfile.username}</p>
            <p>Credits: {userProfile.credits}</p>
            <p>Is Banned: {userProfile.is_banned ? "Yes" : "No"}</p>
            <p>Is Suspended: {userProfile.is_suspended ? "Yes" : "No"}</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold">Session Info</h3>
          <p>Session Active: {session ? "Yes" : "No"}</p>
          {session && (
            <div>
              <p>Expires At: {new Date(session.expires_at! * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        <Button onClick={fetchUserData}>Refresh Data</Button>
      </CardContent>
    </Card>
  );
};

export default AuthTestPanel;
