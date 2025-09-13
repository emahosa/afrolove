import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contest, ContestEntry } from '@/hooks/use-contest';
import '@/ticker.css'; // Import the new CSS file

const WinnerSlider = () => {
  const [winners, setWinners] = useState<ContestEntry[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestWinners = async () => {
      setLoading(true);
      try {
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

        const { data: winnerData, error: winnersError } = await supabase
          .from('contest_winners')
          .select('*, contest_entries(*, profiles(full_name, username))')
          .eq('contest_id', latestContest.id)
          .order('rank', { ascending: true });

        if (winnersError) throw winnersError;

        if (winnerData) {
          const entries = winnerData
            .map(winner => winner.contest_entries)
            .filter(entry => entry !== null) as unknown as ContestEntry[];
          setWinners(entries);
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

  return (
    <div className="ticker-wrap">
      <div className="ticker-move">
        {winners.map(winner => (
          <div key={winner.id} className="ticker-item">
            <strong>{winner.profiles?.full_name || 'Unknown Artist'}</strong> - Won: {contest.title} - Prize: {contest.prize} ({winner.vote_count} votes)
          </div>
        ))}
      </div>
    </div>
  );
};

export default WinnerSlider;
