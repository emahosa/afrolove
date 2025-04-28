
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Clock, ChevronRight, Upload, ThumbsUp, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  ],
  beatFile: "summer_beats_challenge.mp3"
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
  },
  {
    id: "entry-4",
    user: "RhythmKing",
    title: "Tropical Dreams",
    votes: 682,
    hasVoted: false,
    thumbnail: "https://source.unsplash.com/random/300x400?music,4"
  },
  {
    id: "entry-5",
    user: "SongSmith",
    title: "Ocean Melody",
    votes: 541,
    hasVoted: false,
    thumbnail: "https://source.unsplash.com/random/300x400?music,5"
  },
  {
    id: "entry-6",
    user: "VocalWizard",
    title: "Sand and Sun",
    votes: 423,
    hasVoted: false,
    thumbnail: "https://source.unsplash.com/random/300x400?music,6"
  }
];

const Contest = () => {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [votedEntries, setVotedEntries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("current");
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryFile, setEntryFile] = useState<File | null>(null);

  const handleDownloadBeat = () => {
    // Create a link element to download the file
    const link = document.createElement('a');
    link.href = `data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA`;
    link.download = currentContest.beatFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Downloading official beat...", {
      description: "Your download has started."
    });
  };

  const handleSubmitEntry = () => {
    setShowSubmitModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEntryFile(e.target.files[0]);
    }
  };

  const handleEntrySubmission = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entryTitle.trim() || !entryFile) {
      toast.error("Please fill all required fields and upload a video.", {
        description: "Both title and video file are required."
      });
      return;
    }
    
    // In a real app, this would submit the entry to a backend
    toast.success("Entry submitted successfully!", {
      description: "Thank you for participating. Your entry is now being processed."
    });
    
    // Reset form and close modal
    setEntryTitle("");
    setEntryDescription("");
    setEntryFile(null);
    setShowSubmitModal(false);
  };

  const handleVote = (entryId: string) => {
    if (votedEntries.includes(entryId)) {
      toast.error("You've already voted for this entry", {
        description: "You can only vote once per entry."
      });
      return;
    }
    
    // Check if the user has already voted for any entry
    if (votedEntries.length > 0) {
      toast.error("Vote limit reached", {
        description: "You can only vote for one entry in this contest."
      });
      return;
    }
    
    setVotedEntries([...votedEntries, entryId]);
    toast.success("Vote submitted!", {
      description: "Thank you for supporting this artist."
    });
  };

  const handlePlayVideo = (title: string) => {
    toast.info(`Playing "${title}"`, {
      description: "In a complete app, this would play the actual video."
    });
  };

  // Display either featured entries or all entries based on state
  const displayEntries = showAllEntries 
    ? contestEntries 
    : contestEntries.slice(0, 3);

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

      <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Contests</TabsTrigger>
          <TabsTrigger value="past">Past Contests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="space-y-6">
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
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-melody-secondary"
                      onClick={() => setShowRulesModal(true)}
                    >
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
              <Button 
                className="bg-melody-secondary hover:bg-melody-secondary/90"
                onClick={handleDownloadBeat}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Official Beat
              </Button>
              <Button onClick={handleSubmitEntry}>
                <Upload className="mr-2 h-4 w-4" />
                Submit Your Entry
              </Button>
            </CardFooter>
          </Card>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recent Entries</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayEntries.map((entry) => (
                <Card key={entry.id} className="music-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-melody-primary/30">
                      <img 
                        src={entry.thumbnail} 
                        alt={entry.title} 
                        className="w-full h-full object-cover"
                      />
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-melody-secondary"
                        onClick={() => handlePlayVideo(entry.title)}
                      >
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
                          <span className="text-sm">
                            {votedEntries.includes(entry.id) 
                              ? entry.votes + 1 
                              : entry.votes}
                          </span>
                        </div>
                        <Button 
                          variant={votedEntries.includes(entry.id) || entry.hasVoted ? "outline" : "default"}
                          size="sm"
                          className={votedEntries.includes(entry.id) || entry.hasVoted ? "opacity-50 cursor-not-allowed" : ""}
                          onClick={() => handleVote(entry.id)}
                          disabled={votedEntries.includes(entry.id) || entry.hasVoted || votedEntries.length > 0}
                        >
                          {votedEntries.includes(entry.id) || entry.hasVoted ? "Voted" : "Vote Now"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <Button 
                variant="outline"
                onClick={() => setShowAllEntries(!showAllEntries)}
              >
                {showAllEntries ? "Show Less" : "View All Entries"}
              </Button>
            </div>

            {showAllEntries && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="past">
          <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Past Contests</h3>
              <p className="text-muted-foreground">No past contests to display</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rules Modal */}
      <Dialog open={showRulesModal} onOpenChange={setShowRulesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contest Rules - {currentContest.title}</DialogTitle>
            <DialogDescription>
              Please read all rules carefully before participating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Submission Requirements:</h3>
              <ul className="space-y-2 list-disc list-inside text-sm">
                {currentContest.rules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
                <li>All submissions must be original content</li>
                <li>Participants must own the rights to their submission</li>
                <li>No copyrighted material may be used without permission</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Judging Criteria:</h3>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Creativity and originality: 30%</li>
                <li>Technical execution: 25%</li>
                <li>Overall performance quality: 25%</li>
                <li>Public votes: 20%</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Prize Details:</h3>
              <p className="text-sm">The winner will receive {currentContest.prizePool}, which includes a record deal with MelodyVerse Records and promotion across all our platforms.</p>
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">By submitting an entry, you acknowledge that you have read and agreed to these rules. MelodyVerse reserves the right to disqualify any submission that violates these terms.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Entry Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Your Entry</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit your entry to the {currentContest.title}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEntrySubmission} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-title">Entry Title *</Label>
              <Input 
                id="entry-title" 
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Enter a title for your entry"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entry-description">Description</Label>
              <Textarea 
                id="entry-description" 
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                placeholder="Tell us about your entry (optional)"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entry-file">Video File *</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="entry-file" 
                  type="file"
                  onChange={handleFileChange} 
                  accept="video/*"
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Accepted formats: MP4, MOV, AVI (max size: 500MB)</p>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
