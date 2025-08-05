
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Users, Music } from 'lucide-react';

const Contest = () => {
  // Mock contest data
  const activeContest = {
    id: 1,
    title: 'Summer Hit Challenge',
    description: 'Create the next summer anthem',
    prize: '$5,000',
    participants: 342,
    deadline: '2025-08-30',
    status: 'active'
  };

  const upcomingContests = [
    {
      id: 2,
      title: 'Jazz Fusion Contest',
      description: 'Blend traditional jazz with modern elements',
      prize: '$3,000',
      startDate: '2025-09-01'
    },
    {
      id: 3,
      title: 'Holiday Music Challenge',
      description: 'Create festive holiday songs',
      prize: '$7,500',
      startDate: '2025-11-01'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Music Contests</h1>
          <p className="text-gray-400 text-lg">Compete with creators worldwide and win amazing prizes</p>
        </div>

        {/* Active Contest */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Active Contest</h2>
          <Card className="bg-gradient-to-br from-violet-900 to-purple-900 border-violet-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <CardTitle className="text-2xl text-white">{activeContest.title}</CardTitle>
                </div>
                <Badge className="bg-green-600 text-white">Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-200 text-lg">{activeContest.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{activeContest.prize}</div>
                  <div className="text-gray-300">Prize Pool</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-3xl font-bold text-white">
                    <Users className="h-6 w-6 mr-2" />
                    {activeContest.participants}
                  </div>
                  <div className="text-gray-300">Participants</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-3xl font-bold text-white">
                    <Calendar className="h-6 w-6 mr-2" />
                    Aug 30
                  </div>
                  <div className="text-gray-300">Deadline</div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-black font-semibold px-8 py-3 text-lg">
                  <Music className="h-5 w-5 mr-2" />
                  Enter Contest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Contests */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Upcoming Contests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingContests.map((contest) => (
              <Card key={contest.id} className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-white">{contest.title}</CardTitle>
                    <Badge variant="outline" className="border-gray-600 text-gray-300">Coming Soon</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-400">{contest.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-semibold text-green-400">{contest.prize}</div>
                      <div className="text-sm text-gray-400">Prize Pool</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Starts</div>
                      <div className="text-sm text-gray-300">{contest.startDate}</div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                    Notify Me
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contest;
