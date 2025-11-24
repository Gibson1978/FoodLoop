import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { 
  Users, 
  Package, 
  Heart, 
  Truck
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function DashboardStats() {
  const stats = [
    {
      title: "Total Donations",
      value: "2,847",
      change: "+12.5%",
      icon: Package,
      color: "text-green-600"
    },
    {
      title: "Active NGOs",
      value: "45",
      change: "+3",
      icon: Heart,
      color: "text-orange-600"
    },
    {
      title: "Food Redistributed",
      value: "156 tons",
      change: "+8.2%",
      icon: Truck,
      color: "text-blue-600"
    },
    {
      title: "People Fed",
      value: "12,340",
      change: "+15.7%",
      icon: Users,
      color: "text-purple-600"
    }
  ];

  // Monthly donations trend data
  const donationTrendData = [
    { month: 'Apr', donations: 320, foodWeight: 85 },
    { month: 'May', donations: 450, foodWeight: 120 },
    { month: 'Jun', donations: 380, foodWeight: 98 },
    { month: 'Jul', donations: 520, foodWeight: 135 },
    { month: 'Aug', donations: 490, foodWeight: 128 },
    { month: 'Sep', donations: 587, foodWeight: 156 },
  ];

  // User activity data
  const userActivityData = [
    { name: 'Donors', count: 120 },
    { name: 'Volunteers', count: 85 },
    { name: 'Receivers', count: 340 },
  ];

  // Campaign performance data
  const campaignData = [
    { name: 'Holiday Drive', completed: 85, target: 100 },
    { name: 'Fresh Produce', completed: 120, target: 100 },
    { name: 'School Nutrition', completed: 95, target: 100 },
    { name: 'Community Meals', completed: 70, target: 100 },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-sm border-0 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Trends Chart */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>
              Monthly donations and food weight over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={donationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="donations" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Donations"
                />
                <Line 
                  type="monotone" 
                  dataKey="foodWeight" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Food (tons)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Distribution Chart */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>
              Active users by role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userActivityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {userActivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Performance Chart */}
        <Card className="shadow-sm border-0 bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Campaign completion rates (% of target achieved)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed %" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
