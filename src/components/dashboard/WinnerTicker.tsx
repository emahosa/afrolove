import React, { useEffect, useRef, useState } from "react";
import { supabase } from '@/integrations/supabase/client';
import { Contest, ContestEntry } from '@/hooks/use-contest';
import './WinnerTicker.css';

interface Winner {
  name: string;
  contest: string;
  prize: string;
  votes: number;
}

interface WinnerTickerProps {
  speed?: number;    // pixels per second
}

interface ContestWinner {
  id: number;
  contest_id: string;
  entry_id: string;
  rank: number;
  created_at: string;
  contest_entries: ContestEntry | null;
}

const WinnerTicker: React.FC<WinnerTickerProps> = ({ speed = 50 }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
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

        const latestContest = pastContests[0] as Contest;

        // 2. Fetch the winners for that contest
        const { data: winnerData, error: winnersError } = await supabase
          .from('contest_winners')
          .select('*, contest_entries(*, profiles(full_name, username))')
          .eq('contest_id', latestContest.id)
          .order('rank', { ascending: true });

        if (winnersError) throw winnersError;

        if (winnerData) {
          const formattedWinners = winnerData
            .map((winner: ContestWinner) => {
              const entry = winner.contest_entries;
              if (!entry) return null;
              return {
                name: entry.profiles?.full_name || 'Unknown Artist',
                contest: latestContest.title,
                prize: latestContest.prize,
                votes: entry.vote_count || 0,
              };
            })
            .filter((w): w is Winner => w !== null);

          setWinners(formattedWinners);
        }
      } catch (error) {
        console.error('Error fetching latest winners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestWinners();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || winners.length === 0) return;

    // calculate total width of content for infinite loop
    const contentWidth = track.scrollWidth / 2; // Since we duplicated the content
    const duration = contentWidth / speed;

    track.style.setProperty("--content-width", `${contentWidth}px`);
    track.style.setProperty("--duration", `${duration}s`);

  }, [winners, speed]);

  if (loading || winners.length === 0) {
    return null; // Don't show anything while loading or if no winners
  }

  return (
    <div className="winner-ticker-container">
      <div className="winner-ticker">
        <div className="ticker-track" ref={trackRef}>
          {winners.map((winner, idx) => (
            <div className="winner-item" key={idx}>
              🏆 {winner.name} — Won: {winner.contest} — Prize: {winner.prize} ({winner.votes} votes)
            </div>
          ))}
          {/* duplicate for seamless looping */}
          {winners.map((winner, idx) => (
            <div className="winner-item" key={`dup-${idx}`}>
              🏆 {winner.name} — Won: {winner.contest} — Prize: {winner.prize} ({winner.votes} votes)
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WinnerTicker;
