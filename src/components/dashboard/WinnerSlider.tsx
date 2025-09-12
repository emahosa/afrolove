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

  if (loading || !contest) {
    return null; // Don't show anything while loading
  }

  if (winners.length === 0) {
    return null; // Don't render anything if there are no winners to show
  }

  const tickerWrapStyle = {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    padding: '10px 0',
    borderTop: '1px solid #ddd',
    borderBottom: '1px solid #ddd',
    marginBottom: '2rem',
  };

  const tickerStyle = {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    paddingRight: '100%',
    animation: 'ticker 40s linear infinite',
  };

  const tickerItemStyle = {
    display: 'inline-block',
    padding: '0 2rem',
    color: '#333',
    fontSize: '1rem',
  };

  const strongStyle = {
    color: '#000',
  };

  return (
    <>
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>
      <div className="ticker-wrap" style={tickerWrapStyle}>
        <div style={tickerStyle}>
          {winners.map(winner => (
            <div key={winner.id} style={tickerItemStyle}>
              <strong style={strongStyle}>{winner.profiles?.full_name || "Unknown Artist"}</strong> won {contest.title} (Prize: {contest.prize})
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default WinnerSlider;
