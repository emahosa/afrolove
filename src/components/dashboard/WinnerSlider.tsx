import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contest, ContestEntry } from '@/hooks/use-contest';

const WinnerSlider = () => {
  const [winners, setWinners] = useState<ContestEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestWinners = async () => {
      setLoading(true);
      try {
        // 1. Find the most recent past contest
        const { data: pastContests, error: contestsError } = await supabase
          .from('contests')
          .select('*')
          .lt('end_date', new Date().toISOString())
          .order('end_date', { ascending: false })
          .limit(1);

        if (contestsError) throw contestsError;

        if (!pastContests || pastContests.length === 0) {
          setLoading(false);
          return;
        }

        const latestContest = pastContests[0];
        setContest(latestContest);

        // 2. Fetch the winners for that contest
        const { data: winnerData, error: winnersError } = await supabase
          .from('contest_winners')
          .select('*, contest_entries(*)')
          .eq('contest_id', latestContest.id)
          .order('rank', { ascending: true });

        if (winnersError) throw winnersError;

        if (winnerData) {
          const entries = winnerData
            .map(winner => winner.contest_entries)
            .filter(entry => entry !== null) as unknown as ContestEntry[];

          // 3. Fetch profiles for all winners efficiently
          const userIds = entries.map(entry => entry.user_id).filter(id => !!id);

          const profilesMap = new Map();
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .in('id', userIds);

            if (profilesError) {
              console.error('Error fetching profiles in bulk:', profilesError);
            } else {
              profilesData.forEach(p => profilesMap.set(p.id, { full_name: p.full_name, username: p.username }));
            }
          }

          const winnersWithProfiles = entries.map(entry => ({
            ...entry,
            profiles: entry.user_id ? profilesMap.get(entry.user_id) || null : null,
          }));

          setWinners(winnersWithProfiles);
        }
      } catch (error) {
        console.error('Error fetching latest winners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestWinners();
  }, []);

  if (loading || !contest || winners.length === 0) {
    return null;
  }

  const winnerText = winners
    .map(winner => {
      const artistName = winner.profiles?.full_name || 'Unknown Artist';
      const songTitle = winner.title || 'Untitled';
      return `🏆 ${artistName} - "${songTitle}"`;
    })
    .join(' \u00A0 | \u00A0 ');

  return (
    <div className="bg-black bg-opacity-50 text-white py-4 overflow-hidden w-full">
      <div className="whitespace-nowrap animate-scroll-text">
        <span className="font-bold px-4">Recent Winners:</span>
        {winnerText}
      </div>
    </div>
  );
};

export default WinnerSlider;
