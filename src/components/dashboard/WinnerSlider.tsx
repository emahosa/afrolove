import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contest, ContestEntry } from '@/hooks/use-contest';
import { WinnerCard } from '@/components/contest/WinnerCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>Recent Winners</CardTitle>
      </CardHeader>
      <CardContent>
        <Carousel>
          <CarouselContent>
            {winners.map(winner => (
              <CarouselItem key={winner.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <WinnerCard winner={winner} contest={contest} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </CardContent>
    </Card>
  );
};

export default WinnerSlider;
