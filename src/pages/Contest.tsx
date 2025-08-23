
import React, { useState, useEffect } from 'react';
import { useContest } from '@/hooks/use-contest';
import { ContestEntryCard } from '@/components/contest/ContestEntryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Calendar, Users, Music } from 'lucide-react';
import { toast } from 'sonner';

const Contest = () => {
  const { 
    activeContests, 
    contestEntries, 
    loading, 
    error, 
    voteForEntry, 
    setCurrentContest 
  } = useContest();
  
  const [selectedContestIndex, setSelectedContestIndex] = useState(0);

  useEffect(() => {
    if (activeContests.length > 0) {
      setCurrentContest(activeContests[selectedContestIndex]);
    }
  }, [activeContests, selectedContestIndex, setCurrentContest]);

  const handleVote = async (entryId: string) => {
    const success = await voteForEntry(entryId);
    if (success) {
      toast.success('Vote submitted successfully!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
          <p className="text-xl text-gray-300">Loading contests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm border-gray-800">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold mb-2 text-white">Failed to Load Contests</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeContests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900/80 backdrop-blur-sm border-gray-800">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold mb-2 text-white">No Active Contests</h3>
            <p className="text-gray-400">Check back later for new contests!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentContest = activeContests[selectedContestIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-900/20 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Contest Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-purple-400" />
            Music Contests
          </h1>
          
          {activeContests.length > 1 && (
            <div className="flex gap-2 mb-6">
              {activeContests.map((contest, index) => (
                <Button
                  key={contest.id}
                  variant={index === selectedContestIndex ? "default" : "outline"}
                  onClick={() => setSelectedContestIndex(index)}
                  className={index === selectedContestIndex ? 
                    "bg-purple-600 hover:bg-purple-700" : 
                    "border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                  }
                >
                  {contest.title}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Current Contest Info */}
        <Card className="mb-8 bg-gray-900/80 backdrop-blur-sm border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-white">{currentContest.title}</CardTitle>
                <p className="text-gray-400 mt-2">{currentContest.description}</p>
              </div>
              <Badge className="bg-purple-600 text-white">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Trophy className="h-5 w-5 text-purple-400" />
                <span>Prize: {currentContest.prize}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="h-5 w-5 text-purple-400" />
                <span>Ends: {new Date(currentContest.end_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-5 w-5 text-purple-400" />
                <span>{contestEntries.length} Entries</span>
              </div>
            </div>
            {currentContest.rules && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Rules:</h4>
                <p className="text-gray-400 text-sm">{currentContest.rules}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contest Entries */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Music className="h-6 w-6 text-purple-400" />
            Contest Entries ({contestEntries.length})
          </h2>
          
          {contestEntries.length === 0 ? (
            <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-800">
              <CardContent className="p-8 text-center">
                <Music className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold mb-2 text-white">No Entries Yet</h3>
                <p className="text-gray-400">Be the first to submit an entry to this contest!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contestEntries.map((entry) => (
                <ContestEntryCard
                  key={entry.id}
                  entry={entry}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contest;
