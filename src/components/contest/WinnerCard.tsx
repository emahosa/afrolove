import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";
import { ContestEntry } from "@/hooks/use-contest";

interface WinnerCardProps {
  winner: ContestEntry;
}

export const WinnerCard = ({ winner }: WinnerCardProps) => {
  if (!winner) return null;

  return (
    <Card className="bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-purple-500/20 border-2 border-yellow-500/50 shadow-lg relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-yellow-300">
          Contest Winner
        </CardTitle>
        <Trophy className="h-6 w-6 text-yellow-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={`https://ui-avatars.com/api/?name=${winner.profiles?.full_name}&background=random`}
              alt={winner.profiles?.full_name}
              className="h-16 w-16 rounded-full border-2 border-yellow-400"
            />
            <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 transform rotate-12" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              {winner.profiles?.full_name || "Unknown Artist"}
            </p>
            <p className="text-sm text-gray-300">
              @{winner.profiles?.username || "username"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-gray-200 line-clamp-2">{winner.description}</p>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-yellow-300 font-semibold">
          Total Votes: {winner.vote_count}
        </div>
      </CardFooter>
    </Card>
  );
};
