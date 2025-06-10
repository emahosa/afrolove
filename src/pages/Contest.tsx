
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Clock, Eye, Upload, Download, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContest } from "@/hooks/use-contest";
import { useAuth } from "@/contexts/AuthContext";
import { checkUserCredits } from "@/utils/credits";

const Contest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    activeContests,
    loading,
    submitting,
    submitEntry,
    unlockContest,
    unlockedContests,
    downloadInstrumental
  } = useContest();

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [userCredits, setUserCredits] = useState(0);

  // Load user credits when component mounts
  useState(() => {
    if (user) {
      checkUserCredits(user.id).then(setUserCredits);
    }
  });

  const handleViewEntries = (contest: any) => {
    navigate(`/contest/${contest.id}/entries`);
  };

  const handleApply = async (contest: any) => {
    if (!user) {
      toast.error('Please log in to apply for contests');
      return;
    }

    if (unlockedContests.has(contest.id)) {
      // Contest already unlocked, show submit modal
      setSelectedContest(contest);
      setShowSubmitModal(true);
    } else {
      // Show unlock modal
      setSelectedContest(contest);
      const currentCredits = await checkUserCredits(user.id);
      setUserCredits(currentCredits);
      setShowUnlockModal(true);
    }
  };

  const handleUnlockContest = async () => {
    if (selectedContest) {
      const success = await unlockContest(selectedContest.id, selectedContest.credit_cost);
      if (success) {
        setShowUnlockModal(false);
        setShowSubmitModal(true);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        toast.error('Please select a video or audio file');
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      
      setEntryFile(file);
    }
  };

  const handleEntrySubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entryTitle.trim() || !entryFile || !selectedContest) {
      toast.error("Please fill all required fields and upload a file.");
      return;
    }
    
    const success = await submitEntry(selectedContest.id, entryFile, entryDescription, entryTitle);
    
    if (success) {
      setEntryTitle("");
      setEntryDescription("");
      setEntryFile(null);
      setShowSubmitModal(false);
    }
  };

  const handleDownloadBeat = (contest: any) => {
    if (contest?.instrumental_url) {
      downloadInstrumental(contest.instrumental_url, contest.title);
    } else {
      toast.error("No instrumental available for download");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melody-secondary"></div>
        <div className="ml-3">Loading contests...</div>
      </div>
    );
  }

  if (activeContests.length === 0) {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Trophy className="h-7 w-7 text-melody-accent" /> Contests
          </h1>
          <p className="text-muted-foreground">Participate in music contests and win amazing prizes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeContests.map((contest) => {
          const startDate = new Date(contest.start_date);
          const endDate = new Date(contest.end_date);
          const now = new Date();
          const totalTime = endDate.getTime() - startDate.getTime();
          const elapsedTime = now.getTime() - startDate.getTime();
          const progress = Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100);
          const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          return (
            <Card key={contest.id} className="border border-melody-secondary/30">
              <CardHeader className="bg-gradient-to-r from-melody-primary/50 to-melody-secondary/30 rounded-t-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-melody-secondary text-white">
                        Active Contest
                      </Badge>
                      <Badge variant="outline" className="bg-black/20 text-white border-white/30">
                        <Coins className="h-3 w-3 mr-1" />
                        {contest.credit_cost} Credits to Enter
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl text-white">{contest.title}</CardTitle>
                    <CardDescription className="text-white/70 mt-1">{contest.description}</CardDescription>
                  </div>
                  <div className="text-right hidden md:block text-white">
                    <div className="text-sm text-white/80 mb-1 flex items-center justify-end gap-2">
                      <Calendar className="h-4 w-4" /> Deadline
                    </div>
                    <div className="font-semibold">{endDate.toLocaleDateString()}</div>
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
                      <div className="font-semibold">{endDate.toLocaleDateString()}</div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Prize Pool</h3>
                    <p className="text-xl font-bold text-melody-secondary">{contest.prize}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Rules</h3>
                    <p className="text-sm text-muted-foreground">{contest.rules}</p>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-6 pt-0">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Button 
                    onClick={() => handleViewEntries(contest)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Entries
                  </Button>
                  <Button 
                    onClick={() => handleApply(contest)}
                    className="flex-1 bg-melody-secondary hover:bg-melody-secondary/90"
                    disabled={!user}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {user ? 'Apply' : 'Login Required'}
                  </Button>
                  {contest.instrumental_url && (
                    <Button 
                      onClick={() => handleDownloadBeat(contest)}
                      variant="outline"
                      className="flex-1"
                      disabled={!user}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {user ? 'Download Beat' : 'Login Required'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Unlock Contest Modal */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Contest</DialogTitle>
            <DialogDescription>
              You need to unlock this contest to participate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{selectedContest?.title}</h3>
              <p className="text-muted-foreground">{selectedContest?.description}</p>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Credits Required:</span>
                <span className="font-bold text-melody-secondary">{selectedContest?.credit_cost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Your Credits:</span>
                <span className="font-bold">{userCredits}</span>
              </div>
              <div className="border-t mt-2 pt-2">
                <div className="flex justify-between items-center">
                  <span>After Unlock:</span>
                  <span className={`font-bold ${userCredits >= (selectedContest?.credit_cost || 0) ? 'text-green-600' : 'text-red-600'}`}>
                    {userCredits - (selectedContest?.credit_cost || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {userCredits < (selectedContest?.credit_cost || 0) && (
              <div className="text-center text-red-600">
                <p>You don't have enough credits to unlock this contest.</p>
                <p>Please purchase more credits to continue.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUnlockContest}
              disabled={userCredits < (selectedContest?.credit_cost || 0)}
              className="bg-melody-secondary hover:bg-melody-secondary/90"
            >
              Unlock Contest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Entry Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Your Entry</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit your entry to {selectedContest?.title}.
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
              {entryFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {entryFile.name} ({(entryFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: MP4, MOV, AVI, MP3, WAV (max size: 100MB)
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
