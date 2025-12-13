// src/services/pdfService.ts - FINAL FIX FOR GEOGRAPHIC INSIGHTS

import { pdf } from '@react-pdf/renderer';
import { ReportDocument } from '../components/ReportDocument';

// --- UPDATED INTERFACE (Required by ReportDocument.tsx) ---
interface ReportData {
  title: string;
  period: string;
  foodSavedKg: number;
  waterSavedKL: number;
  co2ReducedTons: number;
  peopleHelped: number;
  economicValue: string;
  activeDonors: number;
  completedCampaigns: number;
  analysis: string;

  // New Mapped Fields
  utilizationRate: string; 
  avgParticipantsPerCampaign: string; 
  totalUsers: number;
  activeUsers: number;
  
  // These fields may not exist in the new report format but need defaults
  noShowRate?: string; 
  totalReservations?: number; 
  totalRegistrations: number; 
  topDonorsCount?: number;
  superVolunteersCount?: number;

  donationTrends: Array<{month: string; donations: number; foodWeight: number;}>;
  campaignPerformance: Array<{month: string; totalSpots: number; registeredSpots: number; attendanceRate: number;}>;
  foodCategories: { [category: string]: number };
}

// --- NEW AI DATA INTERFACE (Reflects backend's structured output from admin-AI.ts) ---
interface AiReportData {
  title?: string;
  period?: string;
  foodSavedKg?: number;
  waterSavedKL?: number;
  co2ReducedTons?: number;
  peopleHelped?: number;
  economicValue?: string;
  activeDonors?: number;
  completedCampaigns?: number;
  analysis?: string; // This holds the full analysis text including the geographic summary
  
  // Structured data returned by admin-AI.ts (CoreMetrics)
  coreData: {
    userMetrics: { total: number; active: number; roleDistribution: { [key: string]: number } };
    foodListingMetrics: { collectedQuantityKg: number; utilizationRate: number; topDonorSources: [string, number][]; };
    campaignMetrics: { 
      total: number; 
      registeredSpots: number; 
      totalSpots: number; 
      fillRate: number; 
      statusBreakdown: { [key: string]: number };
    };
    impactMetrics: { foodSavedKg: number; waterSavedLiters: number; co2PreventedKg: number; };
    // FIX: Add the new geographic insights structure
    newKeyInsights?: { 
        highNeedCities: string[]; 
        highWasteCities: string[]; 
        highEfficiencyCities: string[]; 
    };
  }
  
  // Directly passed metrics that were already processed in admin-AI.ts
  utilizationRate?: string;
  noShowRate?: string;
  avgParticipantsPerCampaign?: string;
  totalReservations?: number;
  totalRegistrations?: number;
  topDonorsCount?: number;
  superVolunteersCount?: number;
  donationTrends?: Array<{month: string; donations: number; foodWeight: number;}>;
  campaignPerformance?: Array<{month: string; totalSpots: number; registeredSpots: number; attendanceRate: number;}>;
  foodCategories?: { [category: string]: number };
}

interface UserReportData {
  problemUsers: Array<{
    name: string;
    role: string;
    riskLevel: string;
    reportCount: number;
    averageRating: number;
    warningSigns: string[];
  }>;
}

interface PdfResult {
  url: string;
  filename: string;
}

export class PDFService {
  /**
   * Generates a PDF report and returns a blob URL for WhatsApp-style viewing/download
   */
  static async generateReport(reportData: AiReportData): Promise<PdfResult> {
    try {
      // Safely access data from the structured coreData object
      const u = reportData.coreData?.userMetrics || { total: 0, active: 0, roleDistribution: {} };
      const f = reportData.coreData?.foodListingMetrics || { collectedQuantityKg: 0, utilizationRate: 0, topDonorSources: [] };
      const c = reportData.coreData?.campaignMetrics || { total: 0, registeredSpots: 0, totalSpots: 0, fillRate: 0, statusBreakdown: {} };
      const i = reportData.coreData?.impactMetrics || { foodSavedKg: 0, waterSavedLiters: 0, co2PreventedKg: 0 };
      
      // Calculate derived/missing fields for the PDF format
      const avgParticipants = c.total > 0 ? c.registeredSpots / c.total : 0;
      const topDonorsCount = f.topDonorSources.length;

      // Ensure all required fields have defaults and map to the new structure
      const safeReportData: ReportData = {
        title: reportData.title || 'Platform Impact Report',
        period: reportData.period || new Date().toLocaleDateString(),
        analysis: reportData.analysis || 'No analysis available.', 
        
        // =========================================================================
        // CRITICAL FIX: DIRECTLY MAP NUMERIC DATA FROM NESTED IMPACT/USER METRICS (i and u)
        // =========================================================================
        foodSavedKg: i.foodSavedKg || 0, 
        waterSavedKL: Math.round((i.waterSavedLiters || 0) / 1000), 
        co2ReducedTons: Number((i.co2PreventedKg / 1000).toFixed(2)) || 0, 
        peopleHelped: Math.round((i.foodSavedKg || 0) * 5), 
        
        economicValue: `RM ${Math.round((i.foodSavedKg || 0) * 10).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        activeDonors: u.roleDistribution?.donor || 0,
        completedCampaigns: c.statusBreakdown?.completed || 0, 

        totalUsers: u.total, 
        activeUsers: u.active, 
        
        // String fields (using the calculated values from the backend's core data)
        utilizationRate: `${f.utilizationRate?.toFixed(1) || 0}%`, 
        totalRegistrations: c.registeredSpots || 0, 
        avgParticipantsPerCampaign: avgParticipants.toFixed(1), 
        
        // Existing optional fields 
        noShowRate: reportData.noShowRate || 'N/A', 
        totalReservations: reportData.totalReservations || 0,
        topDonorsCount: topDonorsCount || 0,
        superVolunteersCount: reportData.superVolunteersCount || 0,
        
        // Arrays/Objects
        donationTrends: reportData.donationTrends || [],
        campaignPerformance: reportData.campaignPerformance || [],
        foodCategories: reportData.foodCategories || {}
      };

      // Create the PDF document component
      const documentComponent = <ReportDocument data={safeReportData} />;
      
      // Convert to Blob
      const blob = await pdf(documentComponent).toBlob();
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      
      // Generate filename with timestamp
      const filename = `NourishNow_Impact_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      return { url, filename };
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Downloads a text file (for backup or simple reports)
   */
  static downloadTextFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates a user risk assessment report
   */
  static generateUserReport(userData: UserReportData): void {
    const content = `
User Risk Assessment Report
Generated: ${new Date().toLocaleDateString()}

PROBLEMATIC USERS:
${userData.problemUsers.map((user: any, index: number) => `

${index + 1}. ${user.name} (${user.role})
   - Risk Level: ${user.riskLevel}
   - Reports: ${user.reportCount}
   - Avg Rating: ${user.averageRating}/5
   - Warning Signs: ${user.warningSigns.join(', ')}
`).join('')}

Total Users Requiring Attention: ${userData.problemUsers.length}
    `.trim();

    this.downloadTextFile(content, `User_Risk_Report_${new Date().toISOString().split('T')[0]}.txt`);
  }
}