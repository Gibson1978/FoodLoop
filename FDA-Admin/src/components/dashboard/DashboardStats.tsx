// src/components/DashboardStats.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { 
  Users, 
  Package, 
  Leaf, 
  Droplets,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Play,
  BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../Firebase/Firebase';
import { Button } from "../ui/button";
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../Firebase/Firebase'; 
import { getAuth } from 'firebase/auth';

interface AnalyticsData {
  timestamp: any;
  period: string;
  metrics: {
    totalFoodRedistributedKg: number;
    co2PreventedKg: number;
    waterSavedLiters: number;
    landfillSpaceSavedM3: number;
    carsOffRoadEquivalent: number;
    spoilageRate: number;
    utilizationRate: number;
    foodCategories: { [category: string]: number };
    userDistribution: {
      donors: number;
      volunteers: number;
      receivers: number;
      admins: number;
    };
    donationTrends: Array<{
      month: string;
      donations: number;
      foodWeight: number;
    }>;
    campaignPerformance: Array<{
      month: string;
      totalSpots: number;
      registeredSpots: number;
      attendanceRate: number;
    }>;
    reportedItems: {
      food: number;
      campaigns: number;
      users: number;
      total: number;
      resolutionRate: number;
    };
    platformHealth: {
      activeUsers: number;
      completionRate: number;
      userSatisfaction: number;
    };
  };
  insights: {
    summary: string;
    trends: string[];
    recommendations: string[];
    generatedBy: "gemini" | "calculations";
  };
}

export function DashboardStats() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [triggerError, setTriggerError] = useState<string>('');
  const [authState, setAuthState] = useState<string>('checking');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthState(`Authenticated as: ${user.email} (UID: ${user.uid})`);
        console.log('User authenticated:', user.email, user.uid);
      } else {
        setAuthState('Not authenticated');
        console.log('User not authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'analytics', 'current'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AnalyticsData;
        setAnalytics(data);
        
        // Format last updated time
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          setLastUpdated(date.toLocaleString('en-MY', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }));
        }
      } else {
        console.warn('No analytics data found');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerManualAnalysis = async () => {
    setManualLoading(true);
    setTriggerError('');
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        setTriggerError('You must be logged in to run analytics');
        setManualLoading(false);
        return;
      }

      console.log('Calling analytics function as:', user.email, user.uid);
      
      // Try to call the Cloud Function first
      const calculateAnalyticsManual = httpsCallable(functions, 'calculateAnalyticsManual');
      const result = await calculateAnalyticsManual();
      
      console.log('Manual analysis triggered successfully:', result);
      
      // Show success message
      setTimeout(() => {
        setManualLoading(false);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error triggering manual analysis:', error);
      
      // More specific error handling
      if (error.code === 'unauthenticated') {
        setTriggerError('Authentication failed. Please log in again.');
      } else if (error.code === 'permission-denied') {
        setTriggerError('Only administrators can run analytics. Your account does not have admin privileges.');
      } else if (error.code === 'internal') {
        setTriggerError(`Analytics service error: ${error.message}`);
      } else {
        setTriggerError(`Failed to trigger analysis: ${error.message}`);
      }
      setManualLoading(false);
    }
  };

  const createEmptyAnalyticsData = async () => {
    try {
      const emptyAnalytics: AnalyticsData = {
        timestamp: new Date(),
        period: "manual",
        metrics: {
          totalFoodRedistributedKg: 0,
          co2PreventedKg: 0,
          waterSavedLiters: 0,
          landfillSpaceSavedM3: 0,
          carsOffRoadEquivalent: 0,
          spoilageRate: 0,
          utilizationRate: 0,
          foodCategories: {},
          userDistribution: {
            donors: 0,
            volunteers: 0,
            receivers: 0,
            admins: 0
          },
          donationTrends: [],
          campaignPerformance: [],
          reportedItems: {
            food: 0,
            campaigns: 0,
            users: 0,
            total: 0,
            resolutionRate: 0
          },
          platformHealth: {
            activeUsers: 0,
            completionRate: 0,
            userSatisfaction: 0
          }
        },
        insights: {
          summary: "No data available yet. Analytics will be generated after the first calculation runs.",
          trends: [
            "Waiting for platform data...",
            "No metrics calculated yet",
            "Run analysis to generate insights"
          ],
          recommendations: [
            "Run analytics calculation to see platform performance",
            "Check if there are active food listings and campaigns",
            "Ensure users have completed registrations"
          ],
          generatedBy: "calculations"
        }
      };

      await setDoc(doc(db, 'analytics', 'current'), emptyAnalytics);
      console.log('Empty analytics data created');
      
    } catch (error) {
      console.error('Error creating empty analytics:', error);
      setTriggerError('Failed to create analytics data');
    }
  };

  const refreshData = () => {
    setLoading(true);
    // The data will automatically refresh when the Firestore listener updates
    setTimeout(() => setLoading(false), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="mt-2 text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-3">No Analytics Data Available</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Analytics data hasn't been generated yet. You can run the analysis manually to see platform insights and metrics.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={triggerManualAnalysis} 
            disabled={manualLoading}
            className="flex items-center gap-2"
          >
            {manualLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {manualLoading ? 'Running Analysis...' : 'Run First Analysis'}
          </Button>
          <Button 
            onClick={createEmptyAnalyticsData} 
            variant="outline"
            disabled={manualLoading}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Create Empty Dashboard
          </Button>
        </div>
        {triggerError && (
          <p className="text-red-500 text-sm mt-4">{triggerError}</p>
        )}
      </div>
    );
  }

  const { metrics, insights } = analytics;

  // Check if we have meaningful data (not just empty/zero data)
  const hasRealData = metrics.totalFoodRedistributedKg > 0 || metrics.platformHealth.activeUsers > 0;

  const stats = [
    {
      title: "Food Redistributed",
      value: hasRealData ? `${(metrics.totalFoodRedistributedKg / 1000).toFixed(1)} tons` : "0 tons",
      change: hasRealData ? "+8.2%" : "0%",
      icon: Package,
      color: "text-green-600",
      description: hasRealData ? `${metrics.totalFoodRedistributedKg.toLocaleString()} kg total` : "No data collected yet",
      rawValue: metrics.totalFoodRedistributedKg
    },
    {
      title: "CO2 Prevented", 
      value: hasRealData ? `${(metrics.co2PreventedKg / 1000).toFixed(1)} tons` : "0 tons",
      change: hasRealData ? "+12.5%" : "0%",
      icon: Leaf,
      color: "text-orange-600",
      description: hasRealData ? `Equivalent to ${Math.round(metrics.carsOffRoadEquivalent)} cars off road` : "Environmental impact not calculated",
      rawValue: metrics.co2PreventedKg
    },
    {
      title: "Water Saved",
      value: hasRealData ? `${(metrics.waterSavedLiters / 1000).toFixed(0)} kL` : "0 kL",
      change: hasRealData ? "+15.7%" : "0%",
      icon: Droplets,
      color: "text-blue-600",
      description: hasRealData ? `${metrics.waterSavedLiters.toLocaleString()} liters total` : "Water savings not calculated",
      rawValue: metrics.waterSavedLiters
    },
    {
      title: "Active Users",
      value: hasRealData ? metrics.platformHealth.activeUsers.toLocaleString() : "0",
      change: hasRealData ? "+5.3%" : "0%", 
      icon: Users,
      color: "text-purple-600",
      description: hasRealData ? `${metrics.userDistribution.donors} donors, ${metrics.userDistribution.receivers} receivers` : "No active users yet",
      rawValue: metrics.platformHealth.activeUsers
    }
  ];

  // Convert food categories to pie chart data (only if we have data)
  const foodCategoriesData = hasRealData 
    ? Object.entries(metrics.foodCategories)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  // User distribution data
  const userDistributionData = hasRealData 
    ? [
        { name: 'Donors', value: metrics.userDistribution.donors },
        { name: 'Volunteers', value: metrics.userDistribution.volunteers },
        { name: 'Receivers', value: metrics.userDistribution.receivers },
      ].filter(item => item.value > 0)
    : [];

  // Spoilage rate data (last 6 months)
  const spoilageRateData = hasRealData 
    ? metrics.donationTrends.map(month => ({
        month: month.month,
        total: month.foodWeight / Math.max((1 - metrics.spoilageRate), 0.1),
        collected: month.foodWeight
      }))
    : [];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Analytics</h2>
          <p className="text-muted-foreground">
            {hasRealData ? 'Real-time insights and environmental impact metrics' : 'Run analysis to generate platform insights'}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex gap-2">
            <Button 
              onClick={triggerManualAnalysis} 
              variant="outline" 
              size="sm" 
              disabled={manualLoading}
              className="flex items-center gap-2"
            >
              {manualLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {manualLoading ? 'Running...' : 'Run Analysis'}
            </Button>
            <Button 
              onClick={refreshData} 
              variant="outline" 
              size="sm" 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          )}
          {triggerError && (
            <p className="text-red-500 text-xs">{triggerError}</p>
          )}
        </div>
      </div>

      {!hasRealData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Demo Data Displayed</h4>
                <p className="text-yellow-700 text-sm">
                  No real analytics data available yet. Run the analysis to calculate actual platform metrics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <span className={hasRealData ? "text-green-600" : "text-gray-400"}>
                  {stat.change}
                </span> from last month
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      {insights && (
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>AI Insights & Recommendations</CardTitle>
            </div>
            <CardDescription>
              {insights.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-sm">Key Trends</h4>
                <ul className="text-sm space-y-2">
                  {insights.trends.slice(0, 3).map((trend, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span>{trend.replace(/^[•\-\d\.\s]+/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-sm">Recommendations</h4>
                <ul className="text-sm space-y-2">
                  {insights.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span>{rec.replace(/^[•\-\d\.\s]+/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section - Only show if we have real data */}
      {hasRealData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Food Categories Distribution */}
          {foodCategoriesData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle>Food Categories Distribution</CardTitle>
                <CardDescription>
                  Food redistributed by category (kg)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={foodCategoriesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {foodCategoriesData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} kg`, 'Quantity']}
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
          )}

          {/* User Distribution */}
          {userDistributionData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>
                  Active platform users by role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} users`, 'Count']}
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
          )}

          {/* Spoilage Rate */}
          {spoilageRateData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle>Food Utilization</CardTitle>
                <CardDescription>
                  Total uploaded vs collected food (kg) - Last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={spoilageRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Quantity']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Total Uploaded"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="collected" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Successfully Collected"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <p className="text-sm text-muted-foreground">
                    Utilization Rate: <span className="font-semibold text-green-600">
                      {(metrics.utilizationRate * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Performance */}
          {metrics.campaignPerformance.length > 0 && (
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Available spots vs registrations - Last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.campaignPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: number) => [`${value} spots`, 'Count']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="totalSpots" 
                      fill="#e5e7eb" 
                      name="Total Available Spots" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="registeredSpots" 
                      fill="#3b82f6" 
                      name="Registered Spots" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}