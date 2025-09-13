
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Download, PieChart, BarChart2, LineChart as LineChartIcon, Users, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatsData {
  totalUsers: number;
  activeUsers: number;
  totalSongs: number;
  totalRevenue: string;
  premiumUsers: number;
  customSongRequests: number;
  supportTickets: number;
  contestEntries: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
}

interface GenreData {
  genre: string;
  songs: number;
}

interface UserActivityData {
  day: string;
  songs: number;
  users: number;
}

export const ReportsAnalytics = () => {
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  
  // Real data states
  const [statsData, setStatsData] = useState<StatsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalSongs: 0,
    totalRevenue: '$0',
    premiumUsers: 0,
    customSongRequests: 0,
    supportTickets: 0,
    contestEntries: 0
  });
  
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<MonthlyData[]>([]);
  const [genreDistributionData, setGenreDistributionData] = useState<GenreData[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivityData[]>([]);

  // Fetch live data from database
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats
      const [
        { count: totalUsers },
        { count: totalSongs },
        { count: customSongRequests },
        { count: supportTickets },
        { count: contestEntries }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('songs').select('*', { count: 'exact', head: true }),
        supabase.from('custom_song_requests').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('contest_entries').select('*', { count: 'exact', head: true })
      ]);

      // Calculate active users (users who created songs in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData } = await supabase
        .from('songs')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const activeUsers = new Set(activeUsersData?.map(song => song.user_id) || []).size;

      // Calculate total revenue from payment transactions
      const { data: revenueData } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'completed');
      
      const totalRevenue = revenueData?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;

      // Get monthly revenue data for the chart
      const { data: monthlyRevenue } = await supabase
        .from('payment_transactions')
        .select('amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', new Date(selectedYear, 0, 1).toISOString())
        .lt('created_at', new Date(selectedYear + 1, 0, 1).toISOString());

      // Group by month
      const monthlyData: { [key: string]: number } = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      monthNames.forEach((month, index) => {
        monthlyData[month] = 0;
      });

      monthlyRevenue?.forEach(transaction => {
        const month = new Date(transaction.created_at).getMonth();
        const monthName = monthNames[month];
        monthlyData[monthName] += Number(transaction.amount);
      });

      const formattedMonthlyData = monthNames.map(month => ({
        month,
        revenue: monthlyData[month]
      }));

      // Get genre distribution
      const { data: genres } = await supabase.from('genres').select('id, name');
      const { data: songsWithGenres } = await supabase
        .from('songs')
        .select('genre_id')
        .not('genre_id', 'is', null);

      const genreCount: { [key: string]: number } = {};
      const genreMap = new Map(genres?.map(g => [g.id, g.name]) || []);
      
      songsWithGenres?.forEach(song => {
        const genreName = genreMap.get(song.genre_id) || 'Unknown';
        genreCount[genreName] = (genreCount[genreName] || 0) + 1;
      });

      const genreData = Object.entries(genreCount).map(([genre, songs]) => ({
        genre,
        songs
      }));

      // Get weekly activity data (last 7 days)
      const weekData: UserActivityData[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const { data: daySongs } = await supabase
          .from('songs')
          .select('user_id')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        const uniqueUsers = new Set(daySongs?.map(song => song.user_id) || []).size;
        
        weekData.push({
          day: dayNames[dayStart.getDay()],
          songs: daySongs?.length || 0,
          users: uniqueUsers
        });
      }

      // Update state with real data
      setStatsData({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalSongs: totalSongs || 0,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        premiumUsers: 0, // This would need a premium user system
        customSongRequests: customSongRequests || 0,
        supportTickets: supportTickets || 0,
        contestEntries: contestEntries || 0
      });
      
      setMonthlyRevenueData(formattedMonthlyData);
      setGenreDistributionData(genreData);
      setUserActivityData(weekData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateMonthlyReport = () => {
    setIsMonthlyReportOpen(true);
  };
  
  const handleDownloadReport = async (format: string) => {
    if (format !== 'csv') {
      toast.error('PDF export is not yet available.');
      return;
    }

    try {
      toast.info('Generating your report...');
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { year: selectedYear, month: selectedMonth },
      });

      if (error) {
        throw error;
      }

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly_report_${selectedYear}_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
      setIsMonthlyReportOpen(false);
    } catch (error: any) {
      console.error('Failed to download report:', error);
      toast.error(`Failed to download report: ${error.message}`);
    }
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melody-secondary"></div>
        <span className="ml-2">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="space-x-2">
          <Button onClick={fetchAnalyticsData} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={handleGenerateMonthlyReport}>
            <Calendar className="h-4 w-4 mr-2" />
            Generate Monthly Report
          </Button>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                <p className="text-2xl font-bold">{statsData.totalUsers}</p>
              </div>
              <Users className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                <p className="text-2xl font-bold">{statsData.activeUsers}</p>
              </div>
              <Users className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Songs</p>
                <p className="text-2xl font-bold">{statsData.totalSongs}</p>
              </div>
              <BarChart2 className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">{statsData.totalRevenue}</p>
              </div>
              <LineChartIcon className="text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Custom Song Requests</p>
                <p className="text-2xl font-bold">{statsData.customSongRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Support Tickets</p>
                <p className="text-2xl font-bold">{statsData.supportTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contest Entries</p>
                <p className="text-2xl font-bold">{statsData.contestEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="genres">Genres</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue data across the year {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyRevenueData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly User Activity</CardTitle>
              <CardDescription>Songs created and active users this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={userActivityData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="songs" stroke="#8884d8" name="Songs Created" />
                    <Line type="monotone" dataKey="users" stroke="#82ca9d" name="Active Users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="genres" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Genre Distribution</CardTitle>
              <CardDescription>Distribution of songs by genre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={genreDistributionData}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 50,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="genre" type="category" />
                    <Tooltip />
                    <Bar dataKey="songs" fill="#82ca9d" name="Songs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Monthly Report Dialog */}
      <Dialog open={isMonthlyReportOpen} onOpenChange={setIsMonthlyReportOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Monthly Report: {monthNames[selectedMonth - 1]} {selectedYear}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium">Year</label>
                <select 
                  className="w-full border rounded-md p-2 mt-1"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Month</label>
                <select 
                  className="w-full border rounded-md p-2 mt-1"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {monthNames.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-xl font-bold">{statsData.totalUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">{statsData.totalRevenue}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Songs Generated</p>
                  <p className="text-xl font-bold">{statsData.totalSongs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Contest Entries</p>
                  <p className="text-xl font-bold">{statsData.contestEntries}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-xl font-bold">{statsData.activeUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Support Tickets</p>
                  <p className="text-xl font-bold">{statsData.supportTickets}</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => handleDownloadReport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => handleDownloadReport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => setIsMonthlyReportOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
