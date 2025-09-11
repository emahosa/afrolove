import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contest, ContestEntry } from './use-contest';
import { UserProfile } from '@/types/auth';

export interface Winner {
  id: string;
  contest_id: string;
  user_id: string;
  contest_entry_id: string;
  rank: number;
  created_at: string;
  contest: Contest;
  profile: UserProfile;
  entry: ContestEntry;
}

export const useWinners = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWinners = useCallback(async (recentOnly = false) => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('contest_winners')
        .select(`
          *,
          contests:contest_id(*)
        `)
        .order('created_at', { ascending: false });

      if (recentOnly) {
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      const { data: winnerData, error: winnerError } = await query;

      if (winnerError) throw winnerError;

      const winnersWithDetails = await Promise.all(
        winnerData.map(async (winner) => {
          const { data: entryData, error: entryError } = await supabase
            .from('contest_entries')
            .select('*')
            .eq('id', winner.contest_entry_id)
            .single();

          if (entryError && entryError.code !== 'PGRST116') {
            console.error(`Error fetching entry for winner ${winner.id}:`, entryError);
          }

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', winner.user_id)
            .single();

          if (profileError) {
            console.error(`Error fetching profile for winner ${winner.id}:`, profileError);
          }

          return {
            ...winner,
            contest: winner.contests,
            profile: profileData,
            entry: entryData
          };
        })
      );

      if (recentOnly) {
        setRecentWinners(winnersWithDetails as unknown as Winner[]);
      } else {
        setWinners(winnersWithDetails as unknown as Winner[]);
      }

    } catch (error) {
      console.error('Error fetching winners:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWinners(false); // fetch all winners
    fetchWinners(true); // fetch recent winners
  }, [fetchWinners]);

  return { winners, recentWinners, loading, refetch: () => { fetchWinners(false); fetchWinners(true); } };
};
