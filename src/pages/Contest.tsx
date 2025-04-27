
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Clock, ChevronRight, Upload, ThumbsUp, Play } from "lucide-react";

// Mock current contest data
const currentContest = {
  id: "summer-2023",
  title: "Summer Beats Challenge",
  description: "Create a summer-themed song using our provided beat. Stand a chance to win a record deal and promotion across our platforms.",
  deadline: "June 30, 2025",
  timeRemaining: "14 days",
  progress: 65, // percentage of time elapsed
  prizePool: "$5,000 + Record Deal",
  entries: 243,
  rules: [
    "Use the official beat provided",
    "Upload a video of your performance",
    "Song must be at least 1 minute in length",
    "Content must be appropriate for all audiences",
    "One entry per participant"
  ]
};

// Mock entries
const contestEntries = [
  {
    id: "entry-1",
    user: "MusicMaker432",
    title: "Summer Waves",
    votes: 1243,
    hasVoted: false,
    thumbnail: "https://source.unsplash.com/random/300x400?music,1"
  },
  {
    id: "entry-2",
    user: "BeatsProducer",
    title: "Sunset Vibes",
    votes: 892,
    hasVoted: true,
    thumbnail: "https://source.unsplash.com/random/300x400?music,2"
  },
  {
    id: "entry-3",
    user: "MelodyMaster",
    title: "Beach Party",
    votes: 756,
    hasVoted: false,
    thumbnail: "https://source.unsplash.com/random/300x400?music,3"
  }
];

const Contest = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Trophy className="h-7 w-7 text-melody-accent" /> Contest
          </h1>
          <p className="text-muted-foreground">Participate in music contests and win amazing prizes</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border border-melody-secondary/30">
          <CardHeader className="bg-gradient-to-r from-melody-primary/50 to-melody-secondary/30 rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="secondary" className="mb-2 bg-melody-secondary text-white">Current Contest</Badge>
                <CardTitle className="text-2xl">{currentContest.title}</CardTitle>
                <CardDescription className="text-white/70 mt-1">{currentContest.description}</CardDescription>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-sm text-white/80 mb-1 flex items-center justify-end gap-2">
                  <Calendar className="h-4 w-4" /> Deadline
                </div>
                <div className="font-semibold">{currentContest.deadline}</div>
                <div className="text-sm text-white/80 mt-2 flex items-center justify-end gap-2">
                  <Clock className="h-4 w-4" /> Time Remaining
                </div>
                <div className="font-semibold">{currentContest.timeRemaining}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="md:hidden space-y-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Deadline</div>
                  <div className="font-semibold">{currentContest.deadline}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                  <div className="font-semibold">{currentContest.timeRemaining}</div>
                </div>
              </div>
              <Progress value={currentContest.progress} className="h-2" />
            </div>
            
            <div className="hidden md:block">
              <Progress value={currentContest.progress} className="h-2 mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>Contest Started</div>
                <div>Contest Ends</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Prize Pool</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
                  <p className="text-xl font-bold text-melody-secondary">{currentContest.prizePool}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Entries</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
                  <p className="text-xl font-bold">{currentContest.entries}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Rules</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4">
                  <Button variant="link" className="p-0 h-auto text-melody-secondary">
                    View Rules <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Contest Rules</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {currentContest.rules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-card border-t border-border/50 flex flex-wrap gap-4 justify-between">
            <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
              <Download className="mr-2 h-4 w-4" />
              Download Official Beat
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Submit Your Entry
            </Button>
          </CardFooter>
        </Card>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recent Entries</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contestEntries.map((entry) => (
              <Card key={entry.id} className="music-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-melody-primary/30">
                    <img 
                      src={entry.thumbnail} 
                      alt={entry.title} 
                      className="w-full h-full object-cover"
                    />
                    <Button variant="secondary" size="icon" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-melody-secondary">
                      <Play className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold truncate">{entry.title}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      by {entry.user}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">{entry.votes}</span>
                      </div>
                      <Button 
                        variant={entry.hasVoted ? "outline" : "default"}
                        size="sm"
                        className={entry.hasVoted ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        {entry.hasVoted ? "Voted" : "Vote Now"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <Button variant="outline">View All Entries</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this component separately
const Download = ({ className, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default Contest;
