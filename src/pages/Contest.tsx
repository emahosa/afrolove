
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Upload, Download, Lock, Play, Pause } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContest } from "@/hooks/use-contest";
import { ContestEntryCard } from "@/components/contest/ContestEntryCard";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Contest = () => {
  const { user, isSubscriber } = useAuth();
  const {
    activeContests,
    currentContest,
    contestEntries,
    loading,
    submitting,
    submitEntry,
    voteForEntry,
    downloadInstrumental,
    unlockContest,
    setCurrentContest,
  } = useContest();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [playingEntry, setPlayingEntry] = useState<string | null>(null);

  const handleDownloadBeat = (contest: NonNullable<typeof currentContest>) => {
    if (contest.instrumental_url) {
      downloadInstrumental(contest.instrumental_url, contest.title);
    } else {
      toast.error("No instrumental available for download");
    }
  };

  const handleUnlockContest = async (contest: typeof activeContests[0]) => {
    if (!user) {
      toast.info("Please log in to unlock contests.");
      return;
    }
    await unlockContest(contest.id, contest.entry_fee);
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
    
    if (!entryTitle.trim() || !entryFile || !currentContest) {
      toast.error("Please fill all required fields and upload a file.", {
        description: "Title and media file are required."
      });
      return;
    }
    
    const success = await submitEntry(currentContest.id, entryFile, entryDescription, entryTitle);
    
    if (success) {
      setEntryTitle("");
      setEntryDescription("");
      setEntryFile(null);
      setShowSubmitModal(false);
    }
  };

  const handleVote = async (entryId: string, voterPhone?: string) => {
    return await voteForEntry(entryId, voterPhone);
  };

  const handlePlayEntry = (entryId: string, videoUrl: string) => {
    if (playingEntry === entryId) {
      setPlayingEntry(null);
    } else {
      setPlayingEntry(entryId);
      // Create audio/video element to play the entry
      const mediaElement = document.createElement(videoUrl.includes('.mp4') || videoUrl.includes('.mov') ? 'video' : 'audio');
      mediaElement.src = videoUrl;
      mediaElement.controls = true;
      mediaElement.style.maxWidth = '100%';
      mediaElement.play();
      
      mediaElement.onended = () => setPlayingEntry(null);
      mediaElement.onerror = () => {
        toast.error('Failed to play media file');
        setPlayingEntry(null);
      };
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

      {activeContests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Active Contests</h3>
            <p className="text-muted-foreground">There are no contests running at the moment. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Contests</CardTitle>
            <CardDescription>Vote on entries or unlock contests to participate</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contest</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead>Ends In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeContests.map((contest) => {
                  const endDate = new Date(contest.end_date);
                  const now = new Date();
                  const timeRemaining = endDate.getTime() - now.getTime();
                  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
                  const isUnlocked = contest.is_unlocked || contest.entry_fee === 0;
                  const canUnlock = isSubscriber(); // Only subscribers can unlock

                  return (
                    <TableRow 
                      key={contest.id} 
                      onClick={() => setCurrentContest(contest)}
                      className={`cursor-pointer ${currentContest?.id === contest.id ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell>
                        <div className="font-medium">{contest.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">{contest.description}</div>
                      </TableCell>
                      <TableCell>{contest.prize}</TableCell>
                      <TableCell>{daysRemaining} days</TableCell>
                      <TableCell className="text-right">
                        {isUnlocked ? (
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setShowSubmitModal(true); }}
                              disabled={!user || submitting}
                            >
                              <Upload className="mr-2 h-4 w-4" /> Submit
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-melody-secondary hover:bg-melody-secondary/90"
                              onClick={(e) => { e.stopPropagation(); handleDownloadBeat(contest); }}
                              disabled={!user || !contest.instrumental_url}
                            >
                              <Download className="mr-2 h-4 w-4" /> Beat
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (canUnlock) {
                                handleUnlockContest(contest);
                              } else {
                                toast.error("Only subscribers can unlock contests. Please subscribe first.");
                              }
                            }}
                            disabled={!user || submitting || !canUnlock}
                            title={!canUnlock ? "Subscribe to unlock contests" : `Unlock contest for ${contest.entry_fee} credits`}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            {canUnlock ? `Unlock (${contest.entry_fee} Credits)` : 'Subscribe to Unlock'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {currentContest && (
        <div className="space-y-4 pt-8">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-bold">Entries for {currentContest.title} ({contestEntries.length})</h2>
            <div className="text-right">
              <Badge variant="secondary">Rules</Badge>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">{currentContest.rules}</p>
            </div>
          </div>
          
          {contestEntries.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
                <p className="text-muted-foreground">Be the first to submit an entry!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contestEntries.map((entry) => (
                <ContestEntryCard
                  key={entry.id}
                  entry={entry}
                  onVote={handleVote}
                  onPlay={(entryId, videoUrl) => handlePlayEntry(entryId, videoUrl)}
                  isPlaying={playingEntry === entry.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Entry Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Your Entry</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit your entry to {currentContest?.title}.
              <br />
              {currentContest?.is_unlocked ? <span className="text-green-500">Contest Unlocked! Submission is free.</span> : ''}
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
