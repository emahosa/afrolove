
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { useContest } from "@/hooks/use-contest";
import { ContestEntryCard } from "@/components/contest/ContestEntryCard";
import { useAuth } from "@/contexts/AuthContext";

const ContestEntries = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    contests,
    contestEntries,
    loading,
    voteForEntry,
    hasUserEntry,
    setCurrentContest
  } = useContest();

  const [contest, setContest] = useState<any>(null);

  useEffect(() => {
    if (contestId && contests.length > 0) {
      const foundContest = contests.find(c => c.id === contestId);
      if (foundContest) {
        setContest(foundContest);
        setCurrentContest(foundContest);
      }
    }
  }, [contestId, contests, setCurrentContest]);

  const handleVote = async (entryId: string, voterPhone?: string) => {
    return await voteForEntry(entryId, voterPhone);
  };

  const userHasEntry = contest ? hasUserEntry(contest.id) : false;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Loading contest entries...</div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="space-y-4">
        <Button onClick={() => navigate('/contest')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contests
        </Button>
        <div className="text-center p-8">
          <h3 className="text-lg font-medium mb-2">Contest Not Found</h3>
          <p className="text-muted-foreground">The contest you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate('/contest')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contests
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-melody-accent" />
            {contest.title} - Entries
          </h1>
          <p className="text-muted-foreground">View and vote for contest entries</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contest Entries ({contestEntries.length})
          </CardTitle>
          <CardDescription>
            {userHasEntry 
              ? "You have submitted an entry to this contest. You cannot vote for your own entry."
              : "Click on any entry to vote for it. You can only vote once per contest."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contestEntries.length === 0 ? (
            <div className="text-center p-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
              <p className="text-muted-foreground">Be the first to submit an entry to this contest!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contestEntries.map((entry) => (
                <ContestEntryCard
                  key={entry.id}
                  entry={entry}
                  onVote={handleVote}
                  canVote={!userHasEntry && user !== null}
                  isOwnEntry={user?.id === entry.user_id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContestEntries;
