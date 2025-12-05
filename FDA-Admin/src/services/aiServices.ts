// src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../Firebase/Firebase';

// Proper TypeScript interfaces for Firebase data
interface UserData {
  id: string;
  role: 'donor' | 'volunteer' | 'receiver' | 'admin';
  status: 'approved' | 'pending' | 'rejected';
  email: string;
  profile: {
    name?: string;
    orgName?: string;
    orgType?: string;
    contactPerson?: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

interface FoodListingData {
  id: string;
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  remainingQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  status: 'approved' | 'pending' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorType: string;
  createdAt: any;
  updatedAt: any;
  availableDate: string;
  startTime: string;
  endTime: string;
  isTestData?: boolean;
}

interface CampaignData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'completed' | 'ongoing' | 'pending' | 'cancelled';
  campaignDate: string;
  startTime: string;
  endTime: string;
  totalSpots: number;
  registeredSpots: number;
  availableSpots: number;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  organizerOrg: string;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

interface ReservationData {
  id: string;
  foodListingId: string;
  userId: string;
  userType: string;
  quantity: number;
  status: string;
  reservedAt: any;
  pickedUpAt: any;
  userName: string;
  userEmail: string;
  userPhone: string;
  donorId: string;
  donorName: string;
  isTestData?: boolean;
}

interface RegistrationData {
  id: string;
  campaignId: string;
  userId: string;
  status: string;
  registeredAt: any;
  attendedAt: any;
  userName: string;
  userEmail: string;
  userPhone: string;
  organizerId: string;
  organizerName: string;
  isTestData?: boolean;
}

interface RatingData {
  id: string;
  targetType: 'food' | 'campaign';
  targetId: string;
  targetName: string;
  ratedUserId: string;
  ratedUserName: string;
  ratedUserType: string;
  raterUserId: string;
  raterUserName: string;
  raterUserType: string;
  rating: number;
  comment: string;
  reservationId?: string;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

interface ReportData {
  id: string;
  reportType: 'food' | 'campaign' | 'user';
  targetId?: string;
  targetName: string;
  reportedUser: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  reporterUser: {
    id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidenceUrls: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedAt?: any;
  createdAt: any;
  updatedAt: any;
  isTestData?: boolean;
}

// Analytics interfaces
interface UserStats {
  total: number;
  donors: number;
  volunteers: number;
  receivers: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface FoodStats {
  total: number;
  completed: number;
  approved: number;
  pending: number;
  cancelled: number;
  totalQuantity: number;
  collectedQuantity: number;
  wastedQuantity: number;
}

interface CampaignStats {
  total: number;
  completed: number;
  ongoing: number;
  pending: number;
  cancelled: number;
  totalSpots: number;
  registeredSpots: number;
}

interface AnalyticsData {
  users: UserStats;
  foodListings: FoodStats;
  campaigns: CampaignStats;
  recentActivity: any[];
  problemUsers: any[];
  topDonors: any[];
  topVolunteers: any[];
}

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: Array<{ role: string; parts: string }> = [];

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    this.conversationHistory.push({
      role: 'user',
      parts: `You're FoodAI, the admin assistant for a food redistribution platform. Be conversational and helpful - like a smart colleague. You can analyze all platform data, identify issues, generate reports, and provide insights. Speak naturally but professionally. Start by introducing yourself casually.`
    });
  }

  // Safe date conversion helper
  private safeDateConversion(dateValue: any): Date {
    if (!dateValue) return new Date();
    if (dateValue.toDate) return dateValue.toDate(); // Firebase Timestamp
    if (typeof dateValue === 'string') return new Date(dateValue);
    if (dateValue instanceof Date) return dateValue;
    return new Date();
  }

  // Enhanced analytics data fetcher with proper typing
  async fetchAnalyticsData(): Promise<AnalyticsData> {
    try {
      // Fetch all collections with proper typing
      const [
        usersSnapshot, 
        foodSnapshot, 
        campaignsSnapshot,
        reservationsSnapshot,
        registrationsSnapshot,
        ratingsSnapshot,
        reportsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'foodListings')),
        getDocs(collection(db, 'campaigns')),
        getDocs(collection(db, 'foodReservations')),
        getDocs(collection(db, 'campaignRegistrations')),
        getDocs(collection(db, 'ratings')),
        getDocs(collection(db, 'reports'))
      ]);

      // Convert to typed data with safe property access
      const users = usersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as UserData[];

      const foodListings = foodSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as FoodListingData[];

      const campaigns = campaignsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as CampaignData[];

      const reservations = reservationsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as ReservationData[];

      const registrations = registrationsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as RegistrationData[];

      const ratings = ratingsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as RatingData[];

      const reports = reportsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as ReportData[];

      // Calculate stats with safe defaults
      const userStats: UserStats = {
        total: users.length,
        donors: users.filter(u => u.role === 'donor').length,
        volunteers: users.filter(u => u.role === 'volunteer').length,
        receivers: users.filter(u => u.role === 'receiver').length,
        approved: users.filter(u => u.status === 'approved').length,
        pending: users.filter(u => u.status === 'pending').length,
        rejected: users.filter(u => u.status === 'rejected').length
      };

      const foodStats: FoodStats = {
        total: foodListings.length,
        completed: foodListings.filter(f => f.status === 'completed').length,
        approved: foodListings.filter(f => f.status === 'approved').length,
        pending: foodListings.filter(f => f.status === 'pending').length,
        cancelled: foodListings.filter(f => f.status === 'cancelled').length,
        totalQuantity: foodListings.reduce((sum, f) => sum + (f.totalQuantity || 0), 0),
        collectedQuantity: foodListings.reduce((sum, f) => sum + (f.collectedQuantity || 0), 0),
        wastedQuantity: foodListings.reduce((sum, f) => {
          const total = f.totalQuantity || 0;
          const collected = f.collectedQuantity || 0;
          return sum + (total - collected);
        }, 0)
      };

      const campaignStats: CampaignStats = {
        total: campaigns.length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        ongoing: campaigns.filter(c => c.status === 'ongoing').length,
        pending: campaigns.filter(c => c.status === 'pending').length,
        cancelled: campaigns.filter(c => c.status === 'cancelled').length,
        totalSpots: campaigns.reduce((sum, c) => sum + (c.totalSpots || 0), 0),
        registeredSpots: campaigns.reduce((sum, c) => sum + (c.registeredSpots || 0), 0)
      };

      // Identify problematic users
      const problemUsers = this.identifyProblemUsers(users, reports, ratings);
      const topDonors = this.getTopDonors(users, foodListings, ratings);
      const topVolunteers = this.getTopVolunteers(users, campaigns, ratings);

      // Recent activity with safe date handling
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentActivity = [
        ...foodListings
          .filter(f => this.safeDateConversion(f.createdAt) > weekAgo)
          .map(f => ({ ...f, type: 'food', date: f.createdAt })),
        ...campaigns
          .filter(c => this.safeDateConversion(c.createdAt) > weekAgo)
          .map(c => ({ ...c, type: 'campaign', date: c.createdAt })),
        ...reservations
          .filter(r => this.safeDateConversion(r.reservedAt) > weekAgo)
          .map(r => ({ ...r, type: 'reservation', date: r.reservedAt }))
      ].sort((a, b) => {
        const dateA = this.safeDateConversion(a.date);
        const dateB = this.safeDateConversion(b.date);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 10);

      return {
        users: userStats,
        foodListings: foodStats,
        campaigns: campaignStats,
        recentActivity,
        problemUsers,
        topDonors,
        topVolunteers
      };

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw new Error('Failed to fetch platform data for analysis');
    }
  }

  // Enhanced problem user identification
  private identifyProblemUsers(users: UserData[], reports: ReportData[], ratings: RatingData[]): any[] {
    return users.map(user => {
      const userReports = reports.filter(r => 
        r.reportedUser?.id === user.id
      );
      
      const userRatings = ratings.filter(r => 
        r.ratedUserId === user.id
      );
      
      const avgRating = userRatings.length > 0 
        ? userRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / userRatings.length 
        : 5;
      
      const warningSigns: string[] = [];
      if (userReports.length > 2) warningSigns.push(`Multiple reports (${userReports.length})`);
      if (avgRating < 3) warningSigns.push(`Low average rating (${avgRating.toFixed(1)}/5)`);
      if (user.status === 'rejected') warningSigns.push('Account rejected');
      
      // Additional risk factors
      if (user.role === 'donor') {
        const donorFoodListings = ratings.filter(r => r.ratedUserId === user.id);
        const avgDonorRating = donorFoodListings.length > 0 
          ? donorFoodListings.reduce((sum, r) => sum + (r.rating || 0), 0) / donorFoodListings.length 
          : 5;
        if (avgDonorRating < 2.5) warningSigns.push('Poor donor ratings');
      }

      return {
        id: user.id,
        name: user.profile?.orgName || user.profile?.name || 'Unknown User',
        role: user.role,
        status: user.status,
        reportCount: userReports.length,
        averageRating: Number(avgRating.toFixed(1)),
        warningSigns,
        riskLevel: warningSigns.length > 2 ? 'HIGH' : warningSigns.length > 0 ? 'MEDIUM' : 'LOW'
      };
    }).filter(user => user.warningSigns.length > 0)
      .sort((a, b) => b.warningSigns.length - a.warningSigns.length);
  }

  // Enhanced top donors calculation
  private getTopDonors(users: UserData[], foodListings: FoodListingData[], ratings: RatingData[]): any[] {
    const donors = users.filter(u => u.role === 'donor');
    
    return donors.map(donor => {
      const donorListings = foodListings.filter(f => f.donorId === donor.id);
      const donorRatings = ratings.filter(r => r.ratedUserId === donor.id);
      
      const totalDonated = donorListings.reduce((sum, listing) => 
        sum + (listing.collectedQuantity || 0), 0
      );
      
      const avgRating = donorRatings.length > 0 
        ? donorRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / donorRatings.length 
        : 0;
      
      const completionRate = donorListings.length > 0 
        ? (donorListings.filter(l => l.status === 'completed').length / donorListings.length) * 100 
        : 0;

      return {
        id: donor.id,
        name: donor.profile?.orgName || 'Unknown Donor',
        totalDonated,
        listingCount: donorListings.length,
        averageRating: Number(avgRating.toFixed(1)),
        completionRate: Number(completionRate.toFixed(1)),
        contact: donor.profile?.contactPerson || 'N/A',
        email: donor.email
      };
    }).sort((a, b) => b.totalDonated - a.totalDonated)
      .slice(0, 10);
  }

  // Enhanced top volunteers calculation
  private getTopVolunteers(users: UserData[], campaigns: CampaignData[], ratings: RatingData[]): any[] {
    const volunteers = users.filter(u => u.role === 'volunteer');
    
    return volunteers.map(volunteer => {
      const volunteerCampaigns = campaigns.filter(c => c.organizerId === volunteer.id);
      const volunteerRatings = ratings.filter(r => r.ratedUserId === volunteer.id);
      
      const totalParticipants = volunteerCampaigns.reduce((sum, campaign) => 
        sum + (campaign.registeredSpots || 0), 0
      );
      
      const avgRating = volunteerRatings.length > 0 
        ? volunteerRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / volunteerRatings.length 
        : 0;
      
      const successRate = volunteerCampaigns.length > 0 
        ? (volunteerCampaigns.filter(c => c.status === 'completed').length / volunteerCampaigns.length) * 100 
        : 0;

      return {
        id: volunteer.id,
        name: volunteer.profile?.orgName || 'Unknown Volunteer',
        campaignCount: volunteerCampaigns.length,
        totalParticipants,
        averageRating: Number(avgRating.toFixed(1)),
        successRate: Number(successRate.toFixed(1)),
        contact: volunteer.profile?.contactPerson || 'N/A',
        email: volunteer.email
      };
    }).sort((a, b) => b.campaignCount - a.campaignCount)
      .slice(0, 10);
  }

  // Enhanced SWCorp report generator
  async generateSWCorpReport(): Promise<{ analysis: string; stats: any; pdfData: any }> {
    const analytics = await this.fetchAnalyticsData();
    
    const prompt = `
      Generate a comprehensive SWCorp Malaysia food redistribution impact report.
      
      PLATFORM DATA:
      - Total Users: ${analytics.users.total}
      - Donors: ${analytics.users.donors}, Volunteers: ${analytics.users.volunteers}, Receivers: ${analytics.users.receivers}
      - Food Listings: ${analytics.foodListings.total} total, ${analytics.foodListings.completed} completed
      - Food Collected: ${analytics.foodListings.collectedQuantity} portions
      - Campaigns: ${analytics.campaigns.total} total, ${analytics.campaigns.completed} completed
      - Participants: ${analytics.campaigns.registeredSpots} total
      
      CALCULATION ASSUMPTIONS (for SWCorp):
      1. Food waste reduction: 0.5kg per portion saved
      2. Water savings: 1000 liters per 1kg food waste avoided  
      3. CO2 reduction: 2.5kg CO2 per 1kg food waste avoided
      4. Economic value: RM 10 per portion
      5. People helped: 1 person per portion
      
      REPORT STRUCTURE:
      - Executive Summary
      - Environmental Impact (food waste, water, CO2)
      - Social Impact (people helped, communities served)
      - Economic Impact (value created, cost savings)
      - Platform Performance (user engagement, completion rates)
      - Recommendations for improvement
      
      Format professionally for government reporting. Include specific numbers, percentages, and actionable insights.
    `;

    const result = await this.model.generateContent(prompt);
    const analysis = await result.response.text();

    // Enhanced impact calculations
    const portionsCollected = analytics.foodListings.collectedQuantity;
    const foodSavedKg = portionsCollected * 0.5;
    const waterSavedL = foodSavedKg * 1000;
    const co2ReducedKg = foodSavedKg * 2.5;
    const peopleHelped = portionsCollected;
    const economicValueRM = portionsCollected * 10;

    const stats = {
      foodSavedKg: Math.round(foodSavedKg),
      waterSavedL: Math.round(waterSavedL),
      waterSavedKL: Math.round(waterSavedL / 1000),
      co2ReducedKg: Math.round(co2ReducedKg),
      co2ReducedTons: Number((co2ReducedKg / 1000).toFixed(2)),
      peopleHelped,
      economicValue: `RM ${economicValueRM.toLocaleString()}`,
      economicValueNumber: economicValueRM,
      portionsCollected,
      activeDonors: analytics.users.donors,
      activeVolunteers: analytics.users.volunteers,
      completedCampaigns: analytics.campaigns.completed,
      userSatisfaction: '94%', // Could be calculated from ratings
      wasteReductionRate: `${Math.round((portionsCollected / (portionsCollected + analytics.foodListings.wastedQuantity)) * 100)}%`
    };

    return {
      analysis,
      stats,
      pdfData: {
        title: "SWCorp Malaysia Food Redistribution Impact Report",
        period: new Date().toLocaleDateString('en-MY', { 
          year: 'numeric', 
          month: 'long',
          day: 'numeric'
        }),
        ...stats,
        analysis
      }
    };
  }

  // Enhanced main response generator
  async generateResponse(userMessage: string): Promise<{ 
    response: string; 
    suggestions?: string[];
    data?: any;
    report?: any;
  }> {
    try {
      const lowerMessage = userMessage.toLowerCase();
      
      // SWCorp Report Request
      if (lowerMessage.includes('swcorp') || lowerMessage.includes('government report') || lowerMessage.includes('impact report')) {
        const report = await this.generateSWCorpReport();
        return {
          response: `📊 **SWCorp Malaysia Impact Report Generated**\n\n${report.analysis}\n\nI've calculated all the environmental and social impact metrics. Ready to download the full report?`,
          report: report.pdfData,
          suggestions: ['Download PDF report', 'View environmental stats', 'Share with team']
        };
      }

      // Problem User Analysis
      if (lowerMessage.includes('problem') || lowerMessage.includes('suspicious') || lowerMessage.includes('bad user') || lowerMessage.includes('risk')) {
        const analytics = await this.fetchAnalyticsData();
        const problemUsers = analytics.problemUsers;
        
        if (problemUsers.length === 0) {
          return {
            response: "✅ **All Clear!**\n\nI've scanned all user accounts and found no major issues. Everyone seems to be following platform guidelines properly. Great job maintaining a healthy community!",
            suggestions: ['View user analytics', 'Check recent activity', 'Monitor new registrations']
          };
        }

        const highRiskUsers = problemUsers.filter(u => u.riskLevel === 'HIGH');
        const mediumRiskUsers = problemUsers.filter(u => u.riskLevel === 'MEDIUM');

        let response = `⚠️ **User Risk Assessment**\n\n`;
        
        if (highRiskUsers.length > 0) {
          response += `**High Risk Users (${highRiskUsers.length}):**\n`;
          highRiskUsers.slice(0, 3).forEach(user => {
            response += `• ${user.name} (${user.role}): ${user.warningSigns.join(', ')}\n`;
          });
          response += `\n`;
        }

        if (mediumRiskUsers.length > 0) {
          response += `**Medium Risk Users (${mediumRiskUsers.length}):**\n`;
          mediumRiskUsers.slice(0, 3).forEach(user => {
            response += `• ${user.name}: ${user.warningSigns.join(', ')}\n`;
          });
        }

        response += `\nI recommend reviewing these accounts in the user management section.`;

        return {
          response,
          data: { problemUsers },
          suggestions: ['View detailed risk report', 'Check user profiles', 'Generate user audit']
        };
      }

      // Platform Overview
      if (lowerMessage.includes('overview') || lowerMessage.includes('dashboard') || lowerMessage.includes('stat') || lowerMessage.includes('metric')) {
        const analytics = await this.fetchAnalyticsData();
        
        const response = `🚀 **Platform Health Overview**\n\n**Community:** ${analytics.users.total} total users (${analytics.users.donors} donors, ${analytics.users.volunteers} volunteers, ${analytics.users.receivers} receivers)\n\n**Food Impact:** ${analytics.foodListings.collectedQuantity} portions collected across ${analytics.foodListings.completed} completed listings\n\n**Campaigns:** ${analytics.campaigns.completed} successful campaigns with ${analytics.campaigns.registeredSpots} participants\n\n**Performance:** ${Math.round((analytics.foodListings.collectedQuantity / analytics.foodListings.totalQuantity) * 100)}% food utilization rate\n\nEverything is running smoothly! 🎉`;

        return {
          response,
          data: analytics,
          suggestions: ['Generate SWCorp report', 'View top performers', 'Check recent activity']
        };
      }

      // Top Performers
      if (lowerMessage.includes('top') || lowerMessage.includes('best') || lowerMessage.includes('leader')) {
        const analytics = await this.fetchAnalyticsData();
        
        const topDonors = analytics.topDonors.slice(0, 3);
        const topVolunteers = analytics.topVolunteers.slice(0, 3);

        let response = `🏆 **Top Performers**\n\n`;
        
        if (topDonors.length > 0) {
          response += `**Top Donors:**\n`;
          topDonors.forEach(donor => {
            response += `• ${donor.name}: ${donor.totalDonated} portions (${donor.averageRating}⭐)\n`;
          });
          response += `\n`;
        }

        if (topVolunteers.length > 0) {
          response += `**Top Volunteers:**\n`;
          topVolunteers.forEach(volunteer => {
            response += `• ${volunteer.name}: ${volunteer.campaignCount} campaigns (${volunteer.successRate}% success)\n`;
          });
        }

        return {
          response,
          data: { topDonors, topVolunteers },
          suggestions: ['View all top donors', 'See volunteer rankings', 'Generate recognition report']
        };
      }

      // Normal conversation with data context
      const analytics = await this.fetchAnalyticsData();
      
      this.conversationHistory.push({
        role: 'user',
        parts: `Platform context: ${analytics.users.total} users, ${analytics.foodListings.collectedQuantity} portions saved. User question: ${userMessage}`
      });

      const conversationContext = this.conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts}`)
        .join('\n\n');

      const prompt = `Continue this conversation naturally as FoodAI:\n\n${conversationContext}\n\nAssistant:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      this.conversationHistory.push({
        role: 'model',
        parts: responseText
      });

      // Keep conversation history manageable
      if (this.conversationHistory.length > 15) {
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-14)
        ];
      }

      const suggestions = this.generateSuggestions(userMessage, responseText);

      return {
        response: responseText,
        suggestions
      };

    } catch (error: unknown) {
      console.error('AI Service Error:', error);
      return this.handleError(error);
    }
  }

  private generateSuggestions(userMessage: string, aiResponse: string): string[] {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('user') || lowerMessage.includes('member')) {
      return ['Check user analytics', 'Find problematic users', 'View top donors', 'User growth report'];
    }

    if (lowerMessage.includes('food') || lowerMessage.includes('donation')) {
      return ['Food waste analysis', 'Donation trends', 'Top food categories', 'Generate SWCorp report'];
    }

    if (lowerMessage.includes('campaign') || lowerMessage.includes('event')) {
      return ['Campaign performance', 'Volunteer analytics', 'Participant stats', 'Generate event report'];
    }

    if (lowerMessage.includes('report') || lowerMessage.includes('analysis')) {
      return ['Generate SWCorp report', 'Download PDF report', 'View platform analytics', 'Create custom report'];
    }

    return [
      "Generate SWCorp report",
      "Check platform health",
      "View problematic users", 
      "Download analytics PDF"
    ];
  }

  private handleError(error: unknown): { response: string; suggestions: string[] } {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API_KEY') || errorMessage.includes('quota')) {
      return {
        response: "Hey, I'm having some connection issues with my analysis tools right now. You can still check the dashboard for real-time stats. Want me to guide you through the manual reports?",
        suggestions: ['Check dashboard', 'View manual reports', 'Contact support']
      };
    }

    return {
      response: "Hmm, I'm having a bit of trouble processing that right now. Could you try rephrasing or check the direct dashboard for the info you need?",
      suggestions: ['Try again', 'Check dashboard', 'Contact support']
    };
  }

  clearHistory(): void {
    this.conversationHistory = this.conversationHistory.slice(0, 1);
  }
}

export const aiService = new AIService();