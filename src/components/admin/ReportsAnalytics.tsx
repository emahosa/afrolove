
import { useState } from 'react';
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
import { Calendar, Download, PieChart, BarChart2, LineChart as LineChartIcon, Users } from 'lucide-react';

// Mock data for charts
const monthlyRevenueData = [
  { month: 'Jan', revenue: 1200 },
  { month: 'Feb', revenue: 1900 },
  { month: 'Mar', revenue: 1500 },
  { month: 'Apr', revenue: 2800 },
  { month: 'May', revenue: 2100 },
  { month: 'Jun', revenue: 2500 },
  { month: 'Jul', revenue: 3100 },
  { month: 'Aug', revenue: 2700 },
  { month: 'Sep', revenue: 3500 },
  { month: 'Oct', revenue: 3800 },
  { month: 'Nov', revenue: 3300 },
  { month: 'Dec', revenue: 4200 },
];

const userActivityData = [
  { day: 'Mon', songs: 145, users: 42 },
  { day: 'Tue', songs: 132, users: 38 },
  { day: 'Wed', songs: 164, users: 45 },
  { day: 'Thu', songs: 189, users: 52 },
  { day: 'Fri', songs: 212, users: 58 },
  { day: 'Sat', songs: 250, users: 65 },
  { day: 'Sun', songs: 230, users: 62 },
];

const genreDistributionData = [
  { genre: 'Pop', songs: 520 },
  { genre: 'Rock', songs: 380 },
  { genre: 'Hip Hop', songs: 450 },
  { genre: 'Electronic', songs: 320 },
  { genre: 'Classical', songs: 180 },
  { genre: 'Jazz', songs: 220 },
  { genre: 'Country', songs: 290 },
];

// Stats data
const statsData = {
  totalUsers: 1423,
  activeUsers: 865,
  totalSongs: 12450,
  totalRevenue: '$24,680',
  averageCredits: 14.5,
  contestEntries: 142,
  premiumUsers: 320,
  customSongRequests: 85
};

export const ReportsAnalytics = () => {
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(4); // April
  
  const handleGenerateMonthlyReport = () => {
    setIsMonthlyReportOpen(true);
  };
  
  const handleDownloadReport = (format: string) => {
    toast.success(`Report downloading in ${format.toUpperCase()} format`);
    setIsMonthlyReportOpen(false);
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="space-x-2">
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
            <p className="text-xs text-green-500 mt-2">+12% from last month</p>
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
            <p className="text-xs text-green-500 mt-2">+8% from last month</p>
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
            <p className="text-xs text-green-500 mt-2">+15% from last month</p>
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
            <p className="text-xs text-green-500 mt-2">+21% from last month</p>
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
              <CardDescription>Revenue data across the year 2025</CardDescription>
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
                  <p className="text-sm text-muted-foreground">New Users</p>
                  <p className="text-xl font-bold">124</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">$3,845</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Songs Generated</p>
                  <p className="text-xl font-bold">1,247</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Contest Entries</p>
                  <p className="text-xl font-bold">38</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Average Session</p>
                  <p className="text-xl font-bold">14.5 min</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Support Tickets</p>
                  <p className="text-xl font-bold">67</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { week: 'Week 1', revenue: 950 },
                    { week: 'Week 2', revenue: 870 },
                    { week: 'Week 3', revenue: 1120 },
                    { week: 'Week 4', revenue: 905 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Weekly Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
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
