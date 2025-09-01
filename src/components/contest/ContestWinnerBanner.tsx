
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Calendar } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface Winner {
  id: string;
  contest_id: string;
  user_id: string;
  contest_entry_id: string;
  rank: number;
  won_at: string;
  contests: {
    title: string;
    prize: string;
  };
  user_name: string;
}

const ContestWinnerBanner: React.FC = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWinners = async () => {
      try {
        // Get winners from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // First get contest winners with contest details
        const { data: winnersData, error: winnersError } = await supabase
          .from('contest_winners')
          .select(`
            *,
            contests!inner(title, prize)
          `)
          .gte('won_at', thirtyDaysAgo.toISOString())
          .order('won_at', { ascending: false });

        if (winnersError) {
          console.error('Error fetching contest winners:', winnersError);
          return;
        }

        if (!winnersData || winnersData.length === 0) {
          setWinners([]);
          return;
        }

        // Get user profiles separately
        const userIds = winnersData.map(winner => winner.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
        }

        // Map winners with user info
        const winnersWithUserInfo = winnersData.map(winner => ({
          ...winner,
          user_name: profilesData?.find(profile => profile.id === winner.user_id)?.full_name || 
                   profilesData?.find(profile => profile.id === winner.user_id)?.username || 
                   'Anonymous User'
        }));

        setWinners(winnersWithUserInfo);
      } catch (error) {
        console.error('Error in fetchRecentWinners:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWinners();
  }, []);

  if (loading || winners.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">🏆 Recent Contest Winners 🏆</h2>
      <Carousel className="w-full max-w-4xl mx-auto">
        <CarouselContent>
          {winners.map((winner) => (
            <CarouselItem key={winner.id}>
              <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Trophy className="h-12 w-12 text-yellow-100" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{winner.contests.title}</h3>
                  <p className="text-lg mb-2">
                    🎉 Winner: <span className="font-semibold">{winner.user_name}</span>
                  </p>
                  <p className="text-md mb-3">Prize: {winner.contests.prize}</p>
                  <div className="flex items-center justify-center text-sm opacity-90">
                    <Calendar className="h-4 w-4 mr-2" />
                    Won on {new Date(winner.won_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {winners.length > 1 && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default ContestWinnerBanner;
