
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Clock, ChevronRight, Upload, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContest } from "@/hooks/use-contest";
import { ContestEntryCard } from "@/components/contest/ContestEntryCard";
import { useAuth } from "@/contexts/AuthContext";

const Contest = () => {
  const { user } = useAuth();
  const {
    currentContest,
    contestEntries,
    loading,
    submitting,
    submitEntry,
    voteForEntry,
    downloadInstrumental
  } = useContest();

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeTab, setActiveTab] = useState("current");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryFile, setEntryFile] = useState<File | null>(null);

  const handleDownloadBeat = () => {
    if (currentContest?.instrumental_url) {
      downloadInstrumental(currentContest.instrumental_url, currentContest.title);
    } else {
      toast.error("No instrumental available for download");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEntryFile(e.target.files[0]);
    }
  };

  const handleEntrySubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entryTitle.trim() || !entryFile || !currentContest) {
      toast.error("Please fill all required fields and upload a file.", {
        description: "Title and media file are required."
      });
      return;
    }
    
    const success = await submitEntry(currentContest.id, entryFile, entryDescription, entryTitle);
    
    if (success) {
      // Reset form and close modal
      setEntryTitle("");
      setEntryDescription("");
      setEntryFile(null);
      setShowSubmitModal(false);
    }
  };

  const handleVote = async (entryId: string, voterPhone?: string) => {
    return await voteForEntry(entryId, voterPhone);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Loading contests...</div>
      </div>
    );
  }

  if (!currentContest) {
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
        
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Active Contests</h3>
            <p className="text-muted-foreground">There are no contests running at the moment. Check back soon!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate progress based on time elapsed
  const startDate = new Date(currentContest.start_date);
  const endDate = new Date(currentContest.end_date);
  const now = new Date();
  const totalTime = endDate.getTime() - startDate.getTime();
  const elapsedTime = now.getTime() - startDate.getTime();
  const progress = Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100);

  // Calculate time remaining
  const timeRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));

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
                  <div className="font-semibold">{new Date(currentContest.end_date).toLocaleDateString()}</div>
                  <div className="text-sm text-white/80 mt-2 flex items-center justify-end gap-2">
                    <Clock className="h-4 w-4" /> Time Remaining
                  </div>
                  <div className="font-semibold">{daysRemaining} days</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="md:hidden space-y-4">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Deadline</div>
                    <div className="font-semibold">{new Date(currentContest.end_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                    <div className="font-semibold">{daysRemaining} days</div>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <div className="hidden md:block">
                <Progress value={progress} className="h-2 mb-2" />
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
                    <p className="text-xl font-bold text-melody-secondary">{currentContest.prize}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base">Entries</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3 px-4">
                    <p className="text-xl font-bold">{contestEntries.length}</p>
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
                  {currentContest.rules.split(', ').map((rule, index) => (
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
              <Button onClick={() => setShowSubmitModal(true)} disabled={!user}>
                <Upload className="mr-2 h-4 w-4" />
                {user ? 'Submit Your Entry' : 'Login to Submit'}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Contest Entries ({contestEntries.length})</h2>
            
            {contestEntries.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
                  <p className="text-muted-foreground">Be the first to submit an entry!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <h3 className="font-semibold">Terms & Conditions:</h3>
              <p className="text-sm">{currentContest.terms_conditions}</p>
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
              <Label htmlFor="entry-file">Media File *</Label>
              <Input 
                id="entry-file" 
                type="file"
                onChange={handleFileChange} 
                accept="video/*,audio/*"
                required
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: MP4, MOV, AVI, MP3, WAV (max size: 500MB)
              </p>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contest;
