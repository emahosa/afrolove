import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Lock } from "lucide-react";
import { Contest } from "@/hooks/use-contest";
import { FC, useState, useEffect } from "react";

interface ContestCardProps {
  contest: Contest;
  onUnlock: (contestId: string, fee: number) => void;
  onEnter: (contest: Contest) => void;
  isUnlocking: boolean;
  status: 'upcoming' | 'active';
}

const calculateTimeLeft = (date: string) => {
  const difference = +new Date(date) - +new Date();
  let timeLeft = {};

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
};

export const ContestCard: FC<ContestCardProps> = ({ contest, onUnlock, onEnter, isUnlocking, status }) => {
  const targetDate = status === 'upcoming' ? contest.start_date : contest.end_date;
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearTimeout(timer);
  }, [targetDate]);

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
    if (value) {
      return (
        <span key={interval} className="text-xs">
          {value} {interval}{" "}
        </span>
      );
    }
    return null;
  });

  return (
    <Card key={contest.id} className="bg-white/5 border-white/10 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{contest.title}</h3>
          <div className="text-sm text-gray-400">
            {status === 'upcoming' ? 'Starts in: ' : 'Ends in: '}
            {timerComponents.length ? timerComponents : <span>Time's up!</span>}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{contest.description}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-sm">{contest.prize}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {status === 'upcoming' ? `Starts: ${new Date(contest.start_date).toLocaleDateString()}` : `Ends: ${new Date(contest.end_date).toLocaleDateString()}`}
            </span>
          </div>
        </div>
        <div className="mt-4">
          {contest.is_unlocked ? (
            <Button onClick={() => onEnter(contest)} className="w-full bg-dark-purple hover:bg-opacity-90 font-bold">
              Submit Entry
            </Button>
          ) : (
            <Button onClick={() => onUnlock(contest.id, contest.entry_fee)} className="w-full" disabled={isUnlocking}>
              <Lock className="h-4 w-4 mr-2" />
              Unlock Contest ({contest.entry_fee} credits)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
