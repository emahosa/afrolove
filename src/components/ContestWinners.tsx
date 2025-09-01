
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContestWinner {
  id: string;
  contest_id: string;
  user_id: string;
  contest_entry_id: string;
  rank: number;
  won_at: string;
  contest: {
    title: string;
    prize: string;
    end_date: string;
  };
  user: {
    full_name: string;
    username: string;
  };
  entry: {
    description: string;
    vote_count: number;
  };
}

const ContestWinners: React.FC = () => {
  const [winners, setWinners] = useState<ContestWinner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContestWinners();
  }, []);

  const fetchContestWinners = async () => {
    try {
      // Fetch winners from contests that ended within the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('contest_winners')
        .select(`
          id,
          contest_id,
          user_id,
          contest_entry_id,
          rank,
          won_at,
          contests!inner(title, prize, end_date),
          profiles!inner(full_name, username),
          contest_entries!inner(description, vote_count)
        `)
        .gte('contests.end_date', thirtyDaysAgo.toISOString())
        .order('won_at', { ascending: false });

      if (error) throw error;

      const winnersData = data?.map(item => ({
        id: item.id,
        contest_id: item.contest_id,
        user_id: item.user_id,
        contest_entry_id: item.contest_entry_id,
        rank: item.rank,
        won_at: item.won_at,
        contest: {
          title: (item.contests as any).title,
          prize: (item.contests as any).prize,
          end_date: (item.contests as any).end_date,
        },
        user: {
          full_name: (item.profiles as any).full_name,
          username: (item.profiles as any).username,
        },
        entry: {
          description: (item.contest_entries as any).description,
          vote_count: (item.contest_entries as any).vote_count,
        },
      })) || [];

      setWinners(winnersData);
    } catch (error) {
      console.error('Error fetching contest winners:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextWinner = () => {
    setCurrentIndex((prev) => (prev + 1) % winners.length);
  };

  const prevWinner = () => {
    setCurrentIndex((prev) => (prev - 1 + winners.length) % winners.length);
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-white">Loading winners...</div>
      </div>
    );
  }

  if (winners.length === 0) {
    return null;
  }

  const currentWinner = winners[currentIndex];

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            <span className="font-semibold text-lg">Contest Winner</span>
          </div>
          {winners.length > 1 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevWinner}
                className="text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextWinner}
                className="text-white hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold">{currentWinner.contest.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              Winner: {currentWinner.user.full_name || currentWinner.user.username}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              Votes: {currentWinner.entry.vote_count}
            </Badge>
          </div>
          <p className="text-white/90">Prize: {currentWinner.contest.prize}</p>
          {currentWinner.entry.description && (
            <p className="text-white/80 text-sm italic">
              "{currentWinner.entry.description}"
            </p>
          )}
        </div>

        {winners.length > 1 && (
          <div className="flex justify-center mt-4">
            <div className="flex gap-1">
              {winners.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContestWinners;
