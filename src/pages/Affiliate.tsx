
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, TrendingUp, ExternalLink } from "lucide-react";

const AffiliatePage = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals and earnings</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-muted-foreground">
              People you've referred
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$0.00</div>
            <p className="text-xs text-muted-foreground">
              Total commission earned
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0%</div>
            <p className="text-xs text-muted-foreground">
              Visitors who subscribed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Link</CardTitle>
            <CardDescription>
              Share this link to earn commissions from referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={`https://yourapp.com/register?ref=${user?.id}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-violet-600 text-violet-400 hover:bg-violet-600 hover:text-white"
                >
                  Copy
                </Button>
              </div>
              <Button 
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Share on Social Media
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription>
              Your latest referral activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p>No referral activity yet</p>
              <p className="text-sm">Start sharing your referral link to see activity here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliatePage;
