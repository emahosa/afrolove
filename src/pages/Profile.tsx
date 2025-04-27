
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Music, Trophy, Clock, Settings } from "lucide-react";

// Mock data
const activities = [
  { type: "generated", title: "Created a new song", details: "Afrobeats genre", time: "2 hours ago" },
  { type: "vote", title: "Voted for a contest entry", details: "Summer Beats Challenge", time: "Yesterday" },
  { type: "download", title: "Downloaded a song", details: "Rainy Mood", time: "3 days ago" },
  { type: "generated", title: "Created a new instrumental", details: "R&B genre", time: "1 week ago" },
];

const Profile = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback className="text-xl">{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user?.name}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={logout}>
            Log Out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md mb-6">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription and credits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Current Plan</div>
                  <div className="flex items-center">
                    <Badge variant="outline" className="font-medium">
                      {user?.subscription === "premium" ? "Premium" : "Free"}
                    </Badge>
                    {user?.subscription !== "premium" && (
                      <Button variant="link" className="p-0 h-auto ml-2 text-melody-secondary">
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Available Credits</div>
                  <div className="flex items-center gap-1 text-melody-secondary">
                    <Star size={16} className="fill-melody-secondary" />
                    <span className="font-bold">{user?.credits}</span>
                    <Button variant="link" className="p-0 h-auto ml-2 text-melody-secondary">
                      Get More
                    </Button>
                  </div>
                </div>
              </div>
              
              <div>
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90 w-full md:w-auto">
                  Upgrade to Premium
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                  <div className="font-medium">{user?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Email Address</div>
                  <div className="font-medium">{user?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Member Since</div>
                  <div className="font-medium">April 2025</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Library</CardTitle>
              <CardDescription>Your saved songs and instrumentals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Music className="h-8 w-8 text-melody-secondary mb-2" />
                  <div className="text-3xl font-bold mb-1">5</div>
                  <div className="text-muted-foreground">Generated Songs</div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Music className="h-8 w-8 text-melody-accent mb-2" />
                  <div className="text-3xl font-bold mb-1">3</div>
                  <div className="text-muted-foreground">Generated Instrumentals</div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Star className="h-8 w-8 text-melody-secondary/70 mb-2" />
                  <div className="text-3xl font-bold mb-1">8</div>
                  <div className="text-muted-foreground">Total Tracks</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">View Library</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contest Activity</CardTitle>
              <CardDescription>Your contest entries and votes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Trophy className="h-8 w-8 text-melody-accent mb-2" />
                  <div className="text-3xl font-bold mb-1">1</div>
                  <div className="text-muted-foreground">Contest Entries</div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Star className="h-8 w-8 text-melody-primary mb-2" />
                  <div className="text-3xl font-bold mb-1">24</div>
                  <div className="text-muted-foreground">Votes Received</div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg text-center">
                  <Star className="h-8 w-8 text-melody-secondary mb-2" />
                  <div className="text-3xl font-bold mb-1">12</div>
                  <div className="text-muted-foreground">Votes Cast</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button className="bg-melody-secondary hover:bg-melody-secondary/90">View Contests</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>Your recent activities on MelodyVerse</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="mt-1">
                      {activity.type === "generated" ? (
                        <Music className="h-5 w-5 text-melody-secondary" />
                      ) : activity.type === "vote" ? (
                        <Star className="h-5 w-5 text-melody-accent" />
                      ) : (
                        <Download className="h-5 w-5 text-melody-secondary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-muted-foreground">{activity.details}</div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

export default Profile;
