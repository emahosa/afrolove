import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Trophy } from 'lucide-react';

interface ContestWinner {
  contest_title: string;
  winner_name: string;
  entry_description: string;
}

const ContestWinnerBanner = () => {
  const [winners, setWinners] = useState<ContestWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('contest_winners')
        .select(`
          won_at,
          contests!inner(title),
          profiles!inner(full_name),
          contest_entries!inner(description)
        `)
        .gte('won_at', thirtyDaysAgo.toISOString())
        .order('won_at', { ascending: false });

      if (error) {
        console.error('Error fetching contest winners:', error);
        setLoading(false);
        return;
      }

      const formattedWinners = data.map(item => ({
        contest_title: item.contests.title,
        winner_name: item.profiles.full_name,
        entry_description: item.contest_entries.description,
      }));

      setWinners(formattedWinners);
      setLoading(false);
    };

    fetchWinners();
  }, []);

  if (loading) {
    return null;
  }

  if (winners.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900 text-white py-8">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          <Trophy className="inline-block mr-2 text-yellow-400" />
          Recent Contest Winners
        </h2>
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-4xl mx-auto"
        >
          <CarouselContent>
            {winners.map((winner, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <h3 className="text-xl font-semibold text-yellow-400">{winner.contest_title}</h3>
                      <p className="text-lg mt-2">Winner: {winner.winner_name}</p>
                      <p className="text-md text-gray-400 mt-1">Entry: "{winner.entry_description}"</p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
};

export default ContestWinnerBanner;
