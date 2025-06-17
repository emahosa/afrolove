import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ReferralsListProps {
  affiliateId: string;
}

interface ReferredUser {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: string[]; // e.g., ['voter', 'subscriber']
  status: string; // Derived status like "Subscriber", "Voter"
}

const PAGE_SIZE = 10;

const ReferralsList: React.FC<ReferralsListProps> = ({ affiliateId }) => {
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchReferredUsers = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch referred user profiles with count
      const { data: profilesData, error: profilesError, count } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at', { count: 'exact' })
        .eq('referrer_id', affiliateId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (profilesError) {
        throw new Error(`Failed to fetch referred user profiles: ${profilesError.message}`);
      }

      setTotalItems(count || 0);

      if (!profilesData || profilesData.length === 0) {
        setReferredUsers([]);
        return;
      }

      // Fetch roles for all fetched user IDs
      const userIds = profilesData.map(p => p.id);
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) {
        // Non-fatal, we can proceed without roles, but log it.
        console.warn(`Failed to fetch roles for referred users: ${rolesError.message}`);
      }

      const rolesMap = new Map<string, string[]>();
      if (rolesData) {
        rolesData.forEach(item => {
          if (!rolesMap.has(item.user_id)) {
            rolesMap.set(item.user_id, []);
          }
          rolesMap.get(item.user_id)?.push(item.role);
        });
      }

      const enrichedUsers: ReferredUser[] = profilesData.map(profile => {
        const userRoles = rolesMap.get(profile.id) || ['voter']; // Default to 'voter' if no roles found
        let status = "Voter";
        if (userRoles.includes('subscriber')) {
          status = "Subscriber";
        } else if (userRoles.includes('admin')) {
          status = "Admin"; // Should generally not happen for referrals
        }
        // Add more status logic if needed

        return {
          ...profile,
          roles: userRoles,
          status,
        };
      });

      setReferredUsers(enrichedUsers);

    } catch (err: any) {
      console.error("Error in fetchReferredUsers:", err);
      setError(err.message || "An unexpected error occurred while fetching referrals.");
      setReferredUsers([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    if (affiliateId) {
      fetchReferredUsers(currentPage);
    }
  }, [affiliateId, currentPage, fetchReferredUsers]);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  if (loading && !referredUsers.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your referrals...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600 p-4 bg-red-100 border border-red-300 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (referredUsers.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="p-4 text-center text-muted-foreground">You haven't referred any users yet. Share your link to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" /> My Referrals ({totalItems})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>{format(parseISO(user.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "Subscriber" ? "success" : "outline"}>
                    {user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralsList;
