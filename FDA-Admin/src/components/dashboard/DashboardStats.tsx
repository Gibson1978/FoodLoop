// src/components/DashboardStats.tsx - UPDATED TO INCLUDE RISK MONITORING & BETTER UI FEEDBACK

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
  BarChart3,
  UserCheck,
  UserX,
  UserMinus,
  MapPin, 
  Zap,
  XOctagon,
  HeartOff,
  Scale,
  ShieldOff,
  CheckCircle, 
  XCircle, 
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../Firebase/Firebase';
import { Button } from "../ui/button";
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../Firebase/Firebase'; 
import { getAuth } from 'firebase/auth';

// Import the new hook
import { useRiskDashboardData, type RiskSummary, type UserRiskData } from '../../services/useRiskDashboardData'; 

// -------------------------------------------------------------------------
// INTERFACE DEFINITIONS (UNCHANGED)
// -------------------------------------------------------------------------


type CityStatus = 'High Need' | 'High Waste' | 'High Efficiency' | 'Low Activity' | 'Unknown';

interface CityAnalysis {
  city: string;
  foodListingDensity: number;
  totalQuantityKg: number;
  collectedQuantityKg: number;
  collectionDensity: number;
  receiverDensity: number;
  donorDensity: number;
  utilizationRate: number;
  status: CityStatus;
}

interface GeographicAnalysis {
  totalCities: number;
  byCity: CityAnalysis[];
  keyInsights: {
    highNeedCities: string[];
    highWasteCities: string[];
    highEfficiencyCities: string[];
  };
  // NEW: Thresholds included
  thresholds: {
    HIGH_UTILIZATION: number;
    LOW_UTILIZATION: number;
    LOW_UPLOAD_VS_RECEIVER: number;
    MIN_ACTIVITY: number;
  };
}

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
    userSignupTrends: Array<{
      month: string;
      donors: number;
      volunteers: number;
      receivers: number;
      total: number;
    }>;
    keyUsers: {
      highestRated: Array<{ uid: string; displayName: string; role: string; avg: number; count: number }>;
      lowestRated: Array<{ uid: string; displayName: string; role: string; avg: number; count: number }>;
      mostReported: Array<{ uid: string; displayName: string; role: string; count: number; }>;
    };
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
    // NEW: Geographic Analysis
    geographicAnalysis: GeographicAnalysis; 
  };
  insights: {
    summary: string;
    trends: string[];
    recommendations: string[];
    opportunities: string[]; // Added Opportunities from calculator.ts
    generatedBy: "gemini" | "calculations";
  };
}

// Interface for the phased callable function response
interface AnalyticsManualResult {
    success: boolean;
    message: string;
    phase: 'fetch' | 'calculate' | 'insights' | 'complete' | 'data_fetched' | 'metrics_calculated';
    nextPhase: 'fetch' | 'calculate' | 'insights' | 'none';
    cached?: boolean;
    dataSummary?: {
      usersAnalyzed: number;
      listingsAnalyzed: number;
      campaignsAnalyzed: number;
      metricsCalculated: number;
    };
    data?: AnalyticsData; 
}


export function DashboardStats() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  // [MODIFIED] Consolidated error state to dedicated status states
  const [triggerError, setTriggerError] = useState<string>(''); 
  const [authState, setAuthState] = useState<string>('checking');
  
  // -------------------------------------------------------------------------
  // NEW STATE FOR FUNCTION CALL FEEDBACK
  // -------------------------------------------------------------------------
  const [riskTriggerLoading, setRiskTriggerLoading] = useState(false);
  const [riskTriggerStatus, setRiskTriggerStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [riskTriggerMessage, setRiskTriggerMessage] = useState<string>('');

  const [manualAnalysisStatus, setManualAnalysisStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [manualAnalysisMessage, setManualAnalysisMessage] = useState<string>('');
  // -------------------------------------------------------------------------

  const riskDashboardData = useRiskDashboardData();

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

  // -------------------------------------------------------------------------
  // RISK CHECK TRIGGER FUNCTION (UPDATED FOR STATE)
  // -------------------------------------------------------------------------
  const triggerRiskCheck = async () => {
    setRiskTriggerLoading(true);
    setRiskTriggerStatus('idle');
    setRiskTriggerMessage('');

    try {
        const auth = getAuth();
        if (!auth.currentUser) {
            setRiskTriggerStatus('error');
            setRiskTriggerMessage('Authentication required to run risk checks.');
            return;
        }

        const triggerRiskCheckOnRequest = httpsCallable<void, { status: string; message: string }>(
            functions, 
            'triggerRiskCheckOnRequest'
        );

        const result = await triggerRiskCheckOnRequest();
        
        console.log('Risk Check Result:', result.data.message);
        
        // [FIXED] Replaced alert() with state update
        setRiskTriggerStatus('success');
        setRiskTriggerMessage(`Risk Check Complete: ${result.data.message}`);

        // Automatically clear success message after 5 seconds
        setTimeout(() => setRiskTriggerStatus('idle'), 5000);

    } catch (error: any) {
        console.error('Error triggering risk check:', error);
        
        setRiskTriggerStatus('error');
        if (error.code === 'unauthenticated' || error.code === 'permission-denied') {
            setRiskTriggerMessage('Admin authentication failed. Cannot run risk checks.');
        } else {
            setRiskTriggerMessage(`Risk check failed: ${error.message}`);
        }
        
        // Automatically clear error message after 5 seconds
        setTimeout(() => setRiskTriggerStatus('idle'), 5000);

    } finally {
        setRiskTriggerLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // MANUAL ANALYSIS TRIGGER (PHASED EXECUTION - UPDATED FOR STATE)
  // -------------------------------------------------------------------------
  const triggerManualAnalysis = async () => {
    setManualLoading(true);
    setManualAnalysisStatus('idle');
    setManualAnalysisMessage('');

    try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            setManualAnalysisStatus('error');
            setManualAnalysisMessage('You must be logged in to run analytics');
            setManualLoading(false);
            return;
        }

        console.log('Starting phased analytics run as:', user.email, user.uid);
        setManualAnalysisMessage('Starting analysis: Fetching data...');

        // Explicitly type the callable function
        const calculateAnalyticsManual = httpsCallable<
            { phase: string }, 
            AnalyticsManualResult 
        >(functions, 'calculateAnalyticsManual');

        let nextPhase = 'fetch'; 
        let result: { data: AnalyticsManualResult };

        // --- PHASE 1: FETCH DATA ---
        result = await calculateAnalyticsManual({ phase: nextPhase });
        
        if (result.data.nextPhase === 'none' || result.data.phase === 'complete') {
            // Data was cached and returned immediately
            setManualAnalysisStatus('success');
            setManualAnalysisMessage(result.data.message || 'Analytics up-to-date (cached results used).');
            setTimeout(() => setManualAnalysisStatus('idle'), 5000);
            return; 
        }

        // --- PHASE 2: CALCULATE METRICS ---
        nextPhase = result.data.nextPhase;
        setManualAnalysisMessage('Phase 2/3: Calculating metrics...');
        result = await calculateAnalyticsManual({ phase: nextPhase });
        
        // --- PHASE 3: INSIGHTS & FINALIZE ---
        nextPhase = result.data.nextPhase;
        setManualAnalysisMessage('Phase 3/3: Generating insights and finalizing...');
        result = await calculateAnalyticsManual({ phase: nextPhase });
        
        // Final success state
        setManualAnalysisStatus('success');
        setManualAnalysisMessage('Analysis complete! Dashboard data is now updated.');
        
        // Automatically clear success message after 5 seconds
        setTimeout(() => setManualAnalysisStatus('idle'), 5000);

    } catch (error: any) {
        console.error('Error triggering manual analysis:', error);
        
        setManualAnalysisStatus('error');
        // More specific error handling
        if (error.code === 'unauthenticated') {
            setManualAnalysisMessage('Authentication failed. Please log in again.');
        } else if (error.code === 'permission-denied') {
            setManualAnalysisMessage('Only administrators can run analytics. Your account does not have admin privileges.');
        } else if (error.code === 'internal') {
            setManualAnalysisMessage(`Analytics service error: ${error.message}. Check Cloud Function logs for details.`);
        } else {
            setManualAnalysisMessage(`Failed to trigger analysis: ${error.message}`);
        }

        // Automatically clear error message after 5 seconds
        setTimeout(() => setManualAnalysisStatus('idle'), 5000);

    } finally {
        setManualLoading(false);
        // Clear message if it's not a success/error message
        if (manualAnalysisStatus === 'idle') {
          setManualAnalysisMessage('');
        }
    }
  };

  const createEmptyAnalyticsData = async () => {
    // ... (unchanged)
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
          userSignupTrends: [],
          // NEW EMPTY FIELD
          geographicAnalysis: {
            totalCities: 0,
            byCity: [],
            keyInsights: { highNeedCities: [], highWasteCities: [], highEfficiencyCities: [] },
            thresholds: { HIGH_UTILIZATION: 0.8, LOW_UTILIZATION: 0.3, LOW_UPLOAD_VS_RECEIVER: 0.5, MIN_ACTIVITY: 5 } // Default thresholds
          },
          keyUsers: {
            highestRated: [],
            lowestRated: [],
            mostReported: []
          },
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
          opportunities: [
            "Expand to new geographic regions.",
            "Recruit more enterprise donors.",
            "Develop a referral program."
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

  // -------------------------------------------------------------------------
  // STATS CARD DEFINITION (Fixed KG/Tons and CO2 units) - UNCHANGED
  // -------------------------------------------------------------------------
  const stats = [
    {
      title: "Food Redistributed",
      // FIXED: Show KG as the main value
      value: hasRealData ? `${metrics.totalFoodRedistributedKg.toLocaleString()} kg` : "0 kg",
      change: hasRealData ? "+8.2%" : "0%",
      icon: Package,
      color: "text-green-600",
      // FIXED: Show Tons in the description
      description: hasRealData ? `${(metrics.totalFoodRedistributedKg / 1000).toFixed(1)} tons total` : "No data collected yet",
      rawValue: metrics.totalFoodRedistributedKg
    },
    {
      title: "CO2 Prevented", 
      // FIXED: Show KG as the main value
      value: hasRealData ? `${metrics.co2PreventedKg.toLocaleString()} kg` : "0 kg",
      change: hasRealData ? "+12.5%" : "0%",
      icon: Leaf,
      color: "text-orange-600",
      // FIXED: Show Tons and car equivalent in the description
      description: hasRealData ? `${(metrics.co2PreventedKg / 1000).toFixed(1)} tons | ${Math.round(metrics.carsOffRoadEquivalent)} cars off road` : "Environmental impact not calculated",
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

  // Convert food categories to pie chart data (only if we have data) - UNCHANGED
  const foodCategoriesData = hasRealData 
    ? Object.entries(metrics.foodCategories)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
    : [];

  // User distribution data - UNCHANGED
  const userDistributionData = hasRealData 
    ? [
        { name: 'Donors', value: metrics.userDistribution.donors },
        { name: 'Volunteers', value: metrics.userDistribution.volunteers },
        { name: 'Receivers', value: metrics.userDistribution.receivers },
      ].filter(item => item.value > 0)
    : [];

  // Spoilage rate data (last 6 months) - UNCHANGED
  const spoilageRateData = hasRealData 
    ? metrics.donationTrends.map(month => ({
        month: month.month,
        total: month.foodWeight / Math.max((1 - metrics.spoilageRate), 0.1),
        collected: month.foodWeight
      }))
    : [];

  // User signup trend data - UNCHANGED
  const userSignupTrendData = metrics.userSignupTrends || [];

  // Define color map for User Charts (Receiver: Orange, Donor: Blue, Volunteer: Green) - UNCHANGED
  const USER_ROLE_COLORS: { [key: string]: string } = {
    'Donors': '#3b82f6',     // Donors (Capitalized for Pie Chart Label/Legend)
    'Volunteers': '#10b981', // Volunteers
    'Receivers': '#f59e0b',  // Receivers
    'donors': '#3b82f6',     // Lowercase for Line Chart Data Key
    'volunteers': '#10b981', 
    'receivers': '#f59e0b',  
  };
  
  // Define color array for Food/Other Charts (user-requested scheme + fallbacks) - UNCHANGED
  const CHART_COLORS = ['#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'];

  // -------------------------------------------------------------------------
  // NEW: GEOGRAPHIC DATA PREPARATION (FIXED TO SHOW CANDIDATES) - UNCHANGED
  // -------------------------------------------------------------------------
  const geoAnalysis = metrics.geographicAnalysis;
  const hasGeoData = geoAnalysis && geoAnalysis.totalCities > 0;

  interface CandidateCityData {
      city: string;
      value: number; // Utilization Rate
      volume: number; // Collected Kg
      receiverDensity: number;
      donorDensity: number;
      status: CityStatus;
      totalQuantityKg: number;
  }

  const getCandidateCities = (type: 'Need' | 'Waste' | 'Efficiency', count: number = 3): CandidateCityData[] => {
      let sortedCities: CityAnalysis[];
      
      // Filter for cities with enough activity to be relevant
      const relevantCities = geoAnalysis.byCity.filter(city => 
          city.status !== 'Low Activity' || city.totalQuantityKg > 100
      );

      if (type === 'Waste') {
          // High Waste Candidates: Lowest Utilization Rate, Highest Volume (Worst offenders by utilization)
          sortedCities = relevantCities
              .sort((a, b) => a.utilizationRate - b.utilizationRate || b.totalQuantityKg - a.totalQuantityKg);
      } else if (type === 'Efficiency') {
          // High Efficiency Candidates: Highest Utilization Rate, Highest Volume (Best performers by utilization)
          sortedCities = relevantCities
              .sort((a, b) => b.utilizationRate - a.utilizationRate || b.totalQuantityKg - a.totalQuantityKg);
      } else if (type === 'Need') {
          // High Need Candidates: High Collection Density, High Receiver Density (Highest collection activity)
          // Primary sort by Receivers/Collection Activity, secondary by Volume
          sortedCities = relevantCities
              .sort((a, b) => b.receiverDensity - a.receiverDensity || b.collectionDensity - a.collectionDensity || b.totalQuantityKg - a.totalQuantityKg);
      } else {
          return [];
      }

      return sortedCities.slice(0, count)
          .map(city => ({
              city: city.city,
              value: city.utilizationRate,
              volume: city.collectedQuantityKg,
              receiverDensity: city.receiverDensity, // Added Density
              donorDensity: city.donorDensity,       // Added Density
              totalQuantityKg: city.totalQuantityKg, // Added Total Quantity
              status: city.status
          }));
  };

  const highNeedData = hasGeoData ? getCandidateCities('Need', 3) : [];
  const highWasteData = hasGeoData ? getCandidateCities('Waste', 3) : [];
  const highEfficiencyData = hasGeoData ? getCandidateCities('Efficiency', 3) : [];

  // Find the Geo specific AI insight to display in the dedicated card
  const geoInsight = insights.recommendations.find(r => 
    r.toLowerCase().includes('geographic') || 
    r.toLowerCase().includes('need') || 
    r.toLowerCase().includes('waste')
  ) || insights.recommendations[0] || "No specific geographic recommendations found. Focus on general platform efficiency is the primary strategy.";

  // -------------------------------------------------------------------------
  // RENDER LOGIC
  // -------------------------------------------------------------------------

  // Helper component for status banner
  const StatusBanner = ({ status, message }: { status: 'success' | 'error' | 'idle' | 'running'; message: string }) => {
    if (status === 'idle' || !message) return null;

    const isRunning = status === 'running';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    // Determine styles based on status
    const bannerClasses = isSuccess ? 'border-green-500 bg-green-50' : isError ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50';
    const textClasses = isSuccess ? 'text-green-800' : isError ? 'text-red-800' : 'text-blue-800';
    const iconColor = isSuccess ? 'text-green-600' : isError ? 'text-red-600' : 'text-blue-600';

    let IconComponent: React.ElementType = isSuccess ? CheckCircle : isError ? XCircle : RefreshCw;
    if (isRunning) {
        IconComponent = RefreshCw;
    }

    return (
      <Card className={`border-l-4 ${bannerClasses} mb-4`}>
        {/* MODIFIED: Increased vertical padding and ENSURED MIN HEIGHT (e.g., min-h-16) and made it relative */}
        <CardContent className="py-4 min-h-16 relative"> 
          
          {/* NEW WRAPPER DIV with ABSOLUTE CENTERING */}
          <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-3">
            <IconComponent className={`h-5 w-5 ${isRunning ? 'animate-spin' : ''} ${iconColor} flex-shrink-0`} />
            <p className={`text-sm ${textClasses}`}>
              {message}
            </p>
          </div>
          
        </CardContent>
      </Card>
    );
  };
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
            
            {/* RISK CHECK BUTTON */}
            <Button
                onClick={triggerRiskCheck}
                variant="destructive"
                size="sm"
                disabled={riskTriggerLoading}
                className="flex items-center gap-2"
            >
                {riskTriggerLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Scale className="h-4 w-4" />
                )}
                {riskTriggerLoading ? 'Calculating Risk...' : 'Trigger Risk Check'}
            </Button>
            
            {/* ANALYSIS BUTTON */}
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
              {manualLoading ? 'Running Analysis...' : 'Run Analysis'}
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
        </div>
      </div>
      
      {/* NEW: UI Status Banners */}
      {(riskTriggerStatus !== 'idle' || riskTriggerLoading) && (
          <StatusBanner 
              status={riskTriggerLoading ? 'running' : riskTriggerStatus} 
              message={riskTriggerMessage || (riskTriggerLoading ? 'Risk calculation in progress...' : '')}
          />
      )}
      {(manualAnalysisStatus !== 'idle' || manualLoading) && (
          <StatusBanner 
              status={manualLoading ? 'running' : manualAnalysisStatus} 
              message={manualAnalysisMessage || (manualLoading ? 'Analysis is running, please wait...' : '')}
          />
      )}
      
      {/* Initial Demo Data Warning */}
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

      {/* Stats Cards - MODIFIED GRID LAYOUT to 2x2 (FIXED MD BREAKPOINT) */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-sm border-0 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
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

    {/* NEW: Risk Management & Moderation Card (Counts remain the same) */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SUSPENDED CARD (unchanged) */}
        <Card className="shadow-sm border-0 bg-white lg:col-span-1 border-l-4 border-red-500">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                </div>
                <CardDescription>Accounts flagged for severe policy violation.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold text-red-600">
                    {riskDashboardData.totalSuspended.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total actively suspended users.</p>
            </CardContent>
        </Card>
        
        {/* WARNING CARD (unchanged) */}
        <Card className="shadow-sm border-0 bg-white lg:col-span-1 border-l-4 border-amber-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-sm font-medium">Warning Status (Score &gt;  40)</CardTitle>
              </div>

              <CardDescription>Users needing attention (score &gt; 40, but not suspended).</CardDescription> 
          </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold text-amber-600">
                    {riskDashboardData.totalWarned.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Users currently under active monitoring status.</p>
            </CardContent>
        </Card>

        {/* NEW: TOP 5 HIGH-RISK USERS CARD (The container for individual risk cards) */}
          <Card className="shadow-sm border-0 bg-white lg:col-span-2">
        <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-indigo-600" /> 
                    <CardTitle className="text-lg font-bold">Top 4 High-Risk Users</CardTitle>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Highest Score First</span>
            </div>
            <CardDescription>
                Accounts with the highest calculated Risk Score ({Math.min(4, riskDashboardData.topRiskUsers.length)} shown).
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-3">
            
            <div className="grid grid-cols-2 gap-4"> 
                {riskDashboardData.topRiskUsers.length > 0 ? (
                    riskDashboardData.topRiskUsers.slice(0, 4).map((user: UserRiskData, i) => { 
                        
                        // --- Logic (Kept for style injection) ---
                        const isSuspended = user.status === 'suspended';
                        const isHighRisk = user.riskScore >= 75; 
                        const isWarning = user.riskScore >= 40 && !isSuspended; 
                        
                        const scoreColor = user.riskScore >= 75 ? '#ef4444' : (user.riskScore >= 40 ? '#f59e0b' : '#10b981'); 
                        const cardBorderColor = isSuspended ? 'border-red-500' : (isWarning ? 'border-amber-500' : 'border-gray-200');

                        // --- Text Formatting ---
                        const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
                        const roleBadgeColor = USER_ROLE_COLORS[user.role] || '#6b7280';
                        
                        const breakdown = user.reportBreakdown;
                        const totalReports = user.totalReports;

                        let cleanReason = user.suspensionReason || '';
                        if (cleanReason.includes("RISK_SCORE_EXCEEDED")) {
                            cleanReason = `Flagged for high risk score (${user.riskScore}). Requires admin review.`;
                        } else if (cleanReason.includes("RISK_SCORE_WARNING")) {
                            cleanReason = `Flagged for warning score (${user.riskScore}). Monitoring status active.`;
                        }
                        const finalSuspensionReason = cleanReason;

                        // --- Status Badge Styling ---
                        const statusBadgeClass = isSuspended ? 'bg-red-100 text-red-700' : (isHighRisk ? 'bg-red-100 text-red-700' : (isWarning ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'));


                        return (
                            // Individual Card for each high-risk user
                            <Card 
                                key={user.id} 
                                className={`p-4 shadow-md border-l-4 ${cardBorderColor} transition-shadow hover:shadow-xl`}
                            >
                                
                                {/* ----------------------- ROW 1: NAME, STATUS, ROLE, and SCORE ----------------------- */}
                                <div className="flex justify-between items-start"> 
                                    
                                    {/* Left Side: Name, Status, and Role (Stacked) */}
                                    <div className="flex flex-col gap-1 min-w-0 flex-grow pr-4">
                                        
                                        {/* NAME (text-2xl) and ID (text-base) */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl truncate">{user.name}</span>
                                            <span className="text-base font-medium text-muted-foreground flex-shrink-0">
                                                ID: <span className="font-mono">{user.id.slice(0, 8)}...</span>
                                            </span>
                                        </div>

                                        {/* STATUS and ROLE (text-sm badges) */}
                                        <div className="flex items-center gap-2 mt-1">
                                            
                                            {/* Status Badge (Moved down) */}
                                            <span 
                                                className={`font-semibold text-sm px-2 py-0.5 rounded-full uppercase ${statusBadgeClass}`}
                                            >
                                                {user.status}
                                            </span>
                                            
                                            {/* Role Badge */}
                                            <span 
                                                className="font-semibold text-sm px-2 py-0.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: `${roleBadgeColor}1A`, color: roleBadgeColor }}
                                            >
                                                {roleDisplay}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Right Side: RISK SCORE (VISUAL FOCUS) */}
                                    <div className="flex flex-col items-end gap-0.5 pl-2">
                                        <span className="text-base font-medium text-muted-foreground uppercase leading-none">Risk Score</span>
                                        <span 
                                            className="font-extrabold text-2xl leading-tight font-semibold" 
                                            style={{ color: scoreColor }}
                                        >
                                            {user.riskScore}
                                        </span>
                                    </div>
                                </div>

                                {/* ----------------------- ROW 2: REPORT BREAKDOWN (Now using the full horizontal space) ----------------------- */}
                                <div className="flex items-center text-sm border-gray-200 ">
                                    
                                    <span className="font-bold text-gray-700 whitespace-nowrap mr-4">Total Reports ({totalReports}):</span>
                                    
                                    {totalReports > 0 ? (
                                        <div className="flex items-center gap-3 flex-wrap px-2"> {/* Allows wrapping if many categories */}
                                            {/* High Severity (Full text) */}
                                            {breakdown.high > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-sm px-2 py-1 rounded-full bg-red-100 text-red-700 leading-none">
                                                        {breakdown.high} High
                                                    </span>
                                                </div>
                                            )}
                                            {/* Medium Severity (Full text) */}
                                            {breakdown.medium > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-sm px-2 py-1 rounded-full bg-amber-100 text-amber-600 leading-none">
                                                        {breakdown.medium} Medium
                                                    </span>
                                                </div>
                                            )}
                                            {/* Low Severity (Full text) */}
                                            {breakdown.low > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-sm px-2 py-1 rounded-full bg-green-100 text-green-700 leading-none">
                                                        {breakdown.low} Low
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">No reports filed.</span>
                                    )}
                                </div>
                                
                                {/* ----------------------- ROW 3: SUSPENSION REASON (Moved up by reducing margin/padding) ----------------------- */}
                                {isSuspended && finalSuspensionReason && (
                                    <p className="text-sm text-red-600 italic border-t pt-2 border-dashed">
                                        **Reason**: {finalSuspensionReason}
                                    </p>
                                )}
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-base text-muted-foreground text-center py-6">
                        No users are currently flagged with a risk score or suspended.
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
      </div>
      {/* NEW: Key User Metrics Section - UNCHANGED */}
      {hasRealData && metrics.keyUsers && (
        <div className="grid grid-cols-3 lg:grid-cols-3 gap-6">
          
          {/* Highest Rated User/Donor */}
          <Card className="shadow-sm border-0 bg-white lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium">Top Rated User</CardTitle>
              </div>
              <CardDescription>Highest average rating</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
              {metrics.keyUsers.highestRated.map((user, i) => (
                <li key={i} className="flex flex-col border-b pb-2 last:border-b-0 last:pb-0">
                  <span className="font-semibold">{user.displayName}</span>
                  <div className="flex text-sm text-muted-foreground gap-4">
                    <span>Role: {user.role}</span>
                    <span className="font-bold text-green-600">Rating: {user.avg.toFixed(2)}/5 ({user.count} ratings)</span>
                  </div>
                </li>
              ))}
              {metrics.keyUsers.highestRated.length === 0 && (
                <li className="text-sm text-muted-foreground">No users with ratings yet.</li>
              )}
              </ul>
            </CardContent>
          </Card>

          {/* Lowest Rated Users */}
          <Card className="shadow-sm border-0 bg-white lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                <CardTitle className="text-sm font-medium">Users Needing Attention</CardTitle>
              </div>
              <CardDescription>Top 3 lowest average rated users (2+ ratings)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
              {metrics.keyUsers.lowestRated.map((user, i) => (
                <li key={i} className="flex flex-col border-b pb-2 last:border-b-0 last:pb-0">
                  <span className="font-semibold">{user.displayName}</span>
                  <div className="flex text-sm text-muted-foreground gap-4">
                    <span>Role: {user.role}</span>
                    <span className="font-bold text-red-600">Rating: {user.avg.toFixed(2)}/5 ({user.count} ratings)</span>
                  </div>
                </li>
              ))}
              {metrics.keyUsers.lowestRated.length === 0 && (
                <li className="text-sm text-muted-foreground">No low-rated users found.</li>
              )}
              </ul>
            </CardContent>
          </Card>

          {/* Most Reported Users */}
          <Card className="shadow-sm border-0 bg-white lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-sm font-medium">Users with Most Reports</CardTitle>
              </div>
              <CardDescription>Top 3 users with the highest number of reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
              {metrics.keyUsers.mostReported.map((user, i) => (
                <li key={i} className="flex flex-col border-b pb-2 last:border-b-0 last:pb-0">
                  <span className="font-semibold">{user.displayName}</span>
                  <div className="flex text-sm text-muted-foreground gap-4">
                    <span>Role: {user.role}</span>
                    <span className="font-bold text-yellow-600">Reports: {user.count}</span>
                  </div>
                </li>
              ))}
              {metrics.keyUsers.mostReported.length === 0 && (
                <li className="text-sm text-muted-foreground">No user reports filed yet.</li>
              )}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}


      {/* AI Insights - General Platform Summary - UNCHANGED */}
      {insights && (
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>AI Insights - Platform Summary</CardTitle>
            </div>
            <CardDescription>
              {insights.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <h4 className="font-medium mb-3 text-sm">General Recommendations</h4>
                <ul className="text-sm space-y-2">
                  {insights.recommendations.filter(r => !r.toLowerCase().includes('geographic') && !r.toLowerCase().includes('need') && !r.toLowerCase().includes('waste')).slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span>{rec.replace(/^[•\-\d\.\s]+/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-sm">Opportunities</h4>
                <ul className="text-sm space-y-2">
                  {insights.opportunities.slice(0, 3).map((opp, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span>{opp.replace(/^[•\-\d\.\s]+/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section - Only show if we have real data - UNCHANGED */}
      {hasRealData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* NEW: User Signup Over Time (FIXED COLORS) */}
          {userSignupTrendData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle>User Signup Trends</CardTitle>
                <CardDescription>
                  New users by role over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userSignupTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      formatter={(value: number) => [`${value} users`, 'Count']}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="donors" 
                      stroke={USER_ROLE_COLORS['donors']} // FIXED: Blue for Donors
                      strokeWidth={2}
                      name="Donors"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volunteers" 
                      stroke={USER_ROLE_COLORS['volunteers']} // FIXED: Green for Volunteers
                      strokeWidth={2}
                      name="Volunteers"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="receivers" 
                      stroke={USER_ROLE_COLORS['receivers']} // FIXED: Orange for Receivers
                      strokeWidth={2}
                      name="Receivers"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Spoilage Rate (Food Utilization) */}
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
                      name="Total Uploaded (Potential Waste)"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="collected" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Successfully Collected (Impact)"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-center mt-2">
                  <p className="text-sm text-muted-foreground">
                    Overall Utilization Rate: <span className="font-semibold text-green-600">
                      {(metrics.utilizationRate * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* NEW: GEOGRAPHIC ANALYSIS SECTION (Below Food Utilization) - UNCHANGED */}
      {hasRealData && hasGeoData && (
      <div className="space-y-6">
          <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-indigo-600" />
              <h3 className="text-xl font-bold tracking-tight">Geographic Intervention Areas ({geoAnalysis.totalCities} Cities Analyzed)</h3>
          </div>
          
          {/* Row of 3 Bar Charts*/}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
              
              {/* High Need Cities (Now showing top candidates by collection activity) */}
              {highNeedData.length > 0 && (
                <Card className="shadow-sm border-0 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-medium text-amber-600">Top {highNeedData.length} High Need Candidates</CardTitle>
                        <HeartOff className="h-5 w-5 text-red-600" />
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={highNeedData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="city" stroke="#6b7280" interval={0} angle={-25} textAnchor="end" height={40} tick={{ fontSize: 10 }} />
                                <YAxis 
                                    stroke="#6b7280" 
                                    tickFormatter={(value: number) => `${value.toFixed(0)}%`} 
                                    domain={[0, 100]} 
                                    width={35}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip 
                                    // FIX: Change Tooltip to show RECEIVER DENSITY and Collected Volume (NEED metrics)
                                    formatter={(value: number) => [`${value.toFixed(1)}% Utilization`, 'Efficiency (Bar Metric)']}
                                    labelFormatter={(label) => {
                                        const cityData = highNeedData.find(d => d.city === label);
                                        // Emphasize the NEED: Receivers and Supply Gap
                                        return `City: ${label} | Receivers: ${cityData?.receiverDensity || 0} | Donors: ${cityData?.donorDensity || 0}`;
                                    }}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" name="Utilization Rate" radius={[4, 4, 0, 0]}>
                                    {highNeedData.map((entry, index) => (
                                        <Cell key={`cell-need-${index}`} fill={'#f59e0b'} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-muted-foreground mt-2">Utilization Rate (%)</p>
                    </CardContent>
                </Card>
              )}

              {/* High Waste Cities (Now showing top 3 worst by utilization) */}
              {highWasteData.length > 0 && (
                <Card className="shadow-sm border-0 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-medium text-red-700">Top {highWasteData.length} High Waste Risk Areas</CardTitle>
                        <XOctagon className="h-5 w-5 text-amber-600" />
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={highWasteData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="city" stroke="#6b7280" interval={0} angle={-25} textAnchor="end" height={40} tick={{ fontSize: 10 }} />
                                <YAxis 
                                    stroke="#6b7280" 
                                    tickFormatter={(value: number) => `${value.toFixed(0)}%`} 
                                    domain={[0, 100]} 
                                    width={35}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip 
                                    // FIXED Tooltip formatter and label
                                    formatter={(value: number) => [`${value.toFixed(1)}% Utilization`, 'Efficiency']}
                                    labelFormatter={(label) => {
                                        const cityData = highWasteData.find(d => d.city === label);
                                        return `City: ${label} | Total Uploaded: ${cityData?.totalQuantityKg.toFixed(0) || 0}kg`;
                                    }}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" name="Utilization Rate" radius={[4, 4, 0, 0]}>
                                    {highWasteData.map((entry, index) => (
                                        <Cell key={`cell-waste-${index}`} fill={'#ef4444'} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-muted-foreground mt-2">Utilization Rate (%)</p>
                    </CardContent>
                </Card>
              )}

              {/* High Efficiency Cities (Now showing top 3 best by utilization) */}
              {highEfficiencyData.length > 0 && (
                <Card className="shadow-sm border-0 bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-medium text-green-700">Top {highEfficiencyData.length} Efficiency Areas</CardTitle>
                        <Zap className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={highEfficiencyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="city" stroke="#6b7280" interval={0} angle={-25} textAnchor="end" height={40} tick={{ fontSize: 10 }} />
                                <YAxis 
                                    stroke="#6b7280" 
                                    tickFormatter={(value: number) => `${value.toFixed(0)}%`} 
                                    domain={[0, 100]} 
                                    width={35}
                                    tick={{ fontSize: 10 }}
                                />
                                <Tooltip 
                                    // FIXED Tooltip formatter and label
                                    formatter={(value: number) => [`${value.toFixed(1)}% Utilization`, 'Efficiency']}
                                    labelFormatter={(label) => {
                                        const cityData = highEfficiencyData.find(d => d.city === label);
                                        return `City: ${label} | Collected: ${cityData?.volume.toFixed(0) || 0}kg`;
                                    }}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" name="Utilization Rate" radius={[4, 4, 0, 0]}>
                                    {highEfficiencyData.map((entry, index) => (
                                        <Cell key={`cell-efficiency-${index}`} fill={'#10b981'} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-muted-foreground mt-2">Utilization Rate (%)</p>
                    </CardContent>
                </Card>
              )}
              
              {/* Placeholder message if no relevant cities were found at all */}
              {highNeedData.length === 0 && highWasteData.length === 0 && highEfficiencyData.length === 0 && (
                  <Card className="md:col-span-3 text-center py-6 text-muted-foreground">
                      <AlertTriangle className="h-5 w-5 mx-auto mb-2"/>
                      Low overall activity detected. No cities meet the criteria for High Need, High Waste, or High Efficiency. Focus on boosting activity.
                  </Card>
              )}
          </div>
          
          {/* Dedicated AI Insight Card for Geo Analysis */}
          <Card className="shadow-sm border-0 bg-white border-l-4 border-indigo-500">
              <CardHeader className="flex flex-row items-center gap-3">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base">Targeted Geographic Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm font-medium text-indigo-700 mb-2">
                      Action Focus: {geoInsight.split(':')[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                      {geoInsight.split(':')[1] || geoInsight}
                  </p>
              </CardContent>
          </Card>
      </div>
  )}

      {/* Continuation of remaining charts - UNCHANGED */}
      {hasRealData && (
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Food Categories Distribution (FIXED COLORS) */}
          {foodCategoriesData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white lg:col-span-1">
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
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
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

          {/* User Distribution (FIXED COLORS) */}
          {userDistributionData.length > 0 && (
            <Card className="shadow-sm border-0 bg-white lg:col-span-1">
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
                          fill={USER_ROLE_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} 
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

          {/* Campaign Performance */}
          {metrics.campaignPerformance.length > 0 && (
            <Card className="shadow-sm border-0 bg-white lg:col-span-2">
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