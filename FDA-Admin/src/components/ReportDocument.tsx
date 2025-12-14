// src/components/ReportDocument.tsx

import React, { type JSX } from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
} from '@react-pdf/renderer';

const PdfDocument = Document as any;
const PdfPage = Page as any;
const PdfView = View as any;
const PdfText = Text as any;

const PRIMARY_COLOR = '#00796B'; 
const ACCENT_COLOR = '#4DB6AC'; 
const HEADING_COLOR = '#004D40'; 

const styles = StyleSheet.create({
  page: { 
    padding: 22,
    fontFamily: 'Helvetica', 
    backgroundColor: '#ffffff',
    fontSize: 10,
  },
  header: { 
    marginBottom: 15,
    borderBottomWidth: 2, 
    borderBottomColor: PRIMARY_COLOR, 
    paddingBottom: 8 
  },
  headerTop: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logoSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  title: { fontSize: 20, fontWeight: 'bold', color: HEADING_COLOR },
  subtitle: { fontSize: 9.5, color: '#666666', marginTop: 1 },
  reportInfo: { 
    textAlign: 'right',
    fontSize: 8.5, 
    color: '#666666',
    lineHeight: 1.2
  },
  reportInfoItem: { marginTop: 0, fontSize: 8.5, lineHeight: 1.1 },
  section: { 
    marginBottom: 12, 
    padding: 10, 
    backgroundColor: '#F7FBFB', 
    borderRadius: 3,
    fontSize: 10 
  },
  sectionTitle: { 
    fontSize: 16,
    fontWeight: 'bold', 
    color: PRIMARY_COLOR, 
    marginBottom: 6, 
    borderBottomWidth: 1, 
    borderBottomColor: ACCENT_COLOR, 
    paddingBottom: 3 
  },
  metricsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginBottom: 10 
  },
  metricCard: { 
    width: '48%', 
    padding: 9,
    backgroundColor: 'white', 
    borderRadius: 3, 
    borderWidth: 1, 
    borderColor: ACCENT_COLOR, 
    marginBottom: 8
  },
  metricTitle: { 
    fontSize: 9.5,
    fontWeight: 'bold', 
    color: HEADING_COLOR, 
    marginBottom: 2, 
    lineHeight: 1.1 
  },
  metricValue: { 
    fontSize: 16,
    fontWeight: 'bold', 
    color: PRIMARY_COLOR,
    lineHeight: 1.1 
  },
  metricSubtitle: { 
    fontSize: 8.5,
    color: '#666666',
    lineHeight: 1.1 
  },
  analysisSection: { 
    padding: 10, 
    backgroundColor: '#E0F2F1', 
    borderRadius: 3, 
    marginTop: 8,
    fontSize: 10,
  },
  analysisText: { 
    fontSize: 10,
    lineHeight: 1.25,
    color: '#333333', 
    textAlign: 'justify',
    marginBottom: 3
  },
  aiHeading: { 
    fontSize: 13,
    fontWeight: 'bold', 
    color: HEADING_COLOR, 
    marginTop: 8, 
    marginBottom: 4, 
    lineHeight: 1.1 
  },
  aiSubHeading: { 
    fontSize: 11,
    fontWeight: 'bold', 
    color: HEADING_COLOR, 
    marginTop: 6, 
    marginBottom: 3, 
    borderBottomWidth: 0.5, 
    borderBottomColor: PRIMARY_COLOR, 
    paddingBottom: 2, 
    lineHeight: 1.1 
  },
  aiListItem: { 
    fontSize: 10,
    marginLeft: 6, 
    marginBottom: 2,
    lineHeight: 1.1 
  },
  geoInsightBox: { 
    padding: 7,
    backgroundColor: '#B2DFDB', 
    borderRadius: 2, 
    marginBottom: 8,
    marginTop: 4,
    borderLeftWidth: 3, 
    borderLeftColor: PRIMARY_COLOR 
  },
  geoInsightTitle: { 
    fontSize: 9.5,
    fontWeight: 'bold', 
    color: HEADING_COLOR, 
    marginBottom: 2,
    lineHeight: 1.1 
  },
  cityGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 8
  },
  cityCard: { 
    width: '32%', 
    padding: 6,
    backgroundColor: 'white', 
    borderRadius: 2, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    marginBottom: 4
  },
  cityTitle: { 
    fontSize: 8.5,
    fontWeight: 'bold', 
    color: PRIMARY_COLOR, 
    marginBottom: 1,
    lineHeight: 1 
  },
  cityMetric: { 
    fontSize: 8,
    color: '#666666', 
    lineHeight: 1.1 
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6
  },
  userMetricCard: {
    width: '32%',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    minHeight: 60
  },
  userMetricTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: HEADING_COLOR,
    marginBottom: 2,
    lineHeight: 1
  },
  userMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    lineHeight: 1.1
  },
  compactMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6
  },
  compactMetricCard: {
    width: '48%',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    marginBottom: 8
  },
  compactMetricTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: HEADING_COLOR,
    marginBottom: 2,
    lineHeight: 1
  },
  compactMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    lineHeight: 1.1
  },
  pageNumber: {
    fontSize: 8,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center'
  },
  generationInfo: {
    fontSize: 8,
    color: '#666666',
    marginTop: 5,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

const formatAnalysisText = (text: string) => {
  if (!text) return <PdfText style={styles.analysisText}>No summary provided.</PdfText>;
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let inList = false;
  
  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <PdfView key={`list-${elements.length}`} style={{ marginLeft: 6, marginBottom: 4 }}>
          {currentList.map((item, idx) => (
            <PdfText key={idx} style={styles.aiListItem}>
              • {item.trim().replace(/^\*|\- /, '')}
            </PdfText>
          ))}
        </PdfView>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('## Geographic Coverage & Distribution')) return;
    if (trimmedLine.startsWith('Problem/Summary:') || trimmedLine.startsWith('Primary Action:')) return;
    if (trimmedLine.startsWith('### Current Geographic Status')) return;

    if (!trimmedLine) {
      flushList();
      inList = false;
      elements.push(<PdfText style={{ height: 5 }} />);
      return;
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      inList = false;
      elements.push(
        <PdfView key={index} style={{ marginBottom: 6 }}>
          <PdfText style={styles.aiHeading}>
            {trimmedLine.substring(2)}
          </PdfText>
        </PdfView>
      );
      return;
    }
    
    if (trimmedLine.startsWith('## ')) {
      flushList();
      inList = false;
      elements.push(
        <PdfView key={index} style={{ marginBottom: 4 }}>
          <PdfText style={styles.aiSubHeading}>
            {trimmedLine.substring(3)}
          </PdfText>
        </PdfView>
      );
      return;
    }
    
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      if (!inList) { flushList(); inList = true; }
      currentList.push(trimmedLine);
      return;
    }
    
    const cleanLine = trimmedLine.replace(/\*\*|__/g, '').replace(/_/g, '').replace(/\*/g, ''); 
    flushList();
    inList = false;
    elements.push(
      <PdfView key={index} style={{ marginBottom: 3 }}>
        <PdfText style={styles.analysisText}>
          {cleanLine.trim()}
        </PdfText>
      </PdfView>
    );
  });
  flushList();
  return elements;
};

const extractGeoInsightRaw = (rawText: string) => {
  if (!rawText) return null;
  const problemMatch = rawText.match(/Problem\/Summary:(.*?)(?:Primary Action:|$)/s);
  const actionMatch = rawText.match(/Primary Action:(.*?)(?:###|$)/s);

  if (!problemMatch && !actionMatch) return null;

  return (
    <PdfView style={styles.geoInsightBox}>
      <PdfText style={styles.geoInsightTitle}>CRITICAL GEOGRAPHIC ACTION</PdfText>
      <PdfView style={{ marginBottom: 4 }}>
        <PdfText style={[styles.analysisText, { fontWeight: 'bold', color: '#004D40' }]}>
          Problem/Summary:{' '}
        </PdfText>
        <PdfText style={[styles.analysisText, { lineHeight: 1.2 }]}>
          {problemMatch ? problemMatch[1].trim() : 'Details unavailable.'}
        </PdfText>
      </PdfView>
      <PdfView>
        <PdfText style={[styles.analysisText, { fontWeight: 'bold', color: '#004D40' }]}>
          Primary Action:{' '}
        </PdfText>
        <PdfText style={[styles.analysisText, { lineHeight: 1.2 }]}>
          {actionMatch ? actionMatch[1].trim() : 'Details unavailable.'}
        </PdfText>
      </PdfView>
    </PdfView>
  );
};

const extractCityListsRaw = (rawText: string, listName: string): string[] => {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const targetLine = lines.find(line => line.includes(listName) && line.includes(':'));

  if (!targetLine) return [];

  const defaultEmptyStrings = ['None identified', 'All regions stable', 'No major gaps identified', 'No standout regions'];
  
  const listPart = targetLine.split(':')[1];
  if (!listPart) return [];

  return listPart
    .split(',')
    .map(c => c.trim())
    .filter(c => c && !defaultEmptyStrings.includes(c));
};

interface ReportDocumentProps {
  data: {
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
    
    totalUsers?: number;
    activeUsers?: number;
    utilizationRate: string;
    noShowRate?: string;
    avgParticipantsPerCampaign: string;
    totalReservations?: number;
    totalRegistrations: number;
    topDonorsCount?: number;
    superVolunteersCount?: number;
    donationTrends: Array<{month: string; donations: number; foodWeight: number;}>;
    campaignPerformance: Array<{month: string; totalSpots: number; registeredSpots: number; attendanceRate: number;}>;
    foodCategories: { [category: string]: number };
    
    totalReceivers: number;
    activeReceivers: number;
    totalVolunteers: number;
    activeVolunteers: number;
    receiverEngagementRate?: string;
    volunteerEngagementRate?: string;
  };
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ data }) => {
  const analysisElements = formatAnalysisText(data.analysis);
  const geoInsightElement = extractGeoInsightRaw(data.analysis);
  
  const cityLists = {
    best: extractCityListsRaw(data.analysis, 'Best Covered Cities'),
    need: extractCityListsRaw(data.analysis, 'Areas Needing Attention'),
    waste: extractCityListsRaw(data.analysis, 'Immediate Focus Areas') 
  };

  const generatedDate = new Date();
  const dateString = generatedDate.toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeString = generatedDate.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });

  const foodSavedKg = data.foodSavedKg || 0;
  const co2ReducedTons = data.co2ReducedTons || 0;
  const mealsProvided = Math.round(foodSavedKg * 5);
  const carsOffRoad = Math.round(co2ReducedTons * 1000 / 4000);

  const totalReceivers = data.totalReceivers || 0;
  const activeReceivers = data.activeReceivers || 0;
  const totalVolunteers = data.totalVolunteers || 0;
  const activeVolunteers = data.activeVolunteers || 0;
  
  const receiverEngagementRate = data.receiverEngagementRate || 
    (totalReceivers > 0 ? `${Math.round((activeReceivers / totalReceivers) * 100)}%` : 'N/A');
  const volunteerEngagementRate = data.volunteerEngagementRate || 
    (totalVolunteers > 0 ? `${Math.round((activeVolunteers / totalVolunteers) * 100)}%` : 'N/A');

  const docId = `NN-${generatedDate.getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  return (
    <PdfDocument>
      {/* PAGE 1: Key Metrics & Environmental Impact */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header}>
          <PdfView style={styles.headerTop}>
            <PdfView style={styles.logoSection}>
              <PdfView style={{ 
                width: 36, 
                height: 36, 
                backgroundColor: PRIMARY_COLOR, 
                borderRadius: 3, 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <PdfText style={{ fontSize: 8, color: 'white' }}>Logo</PdfText>
              </PdfView>
              <PdfView>
                <PdfText style={styles.title}>NourishNow Impact Report</PdfText> 
                <PdfText style={styles.subtitle}>Food Redistribution Platform</PdfText>
              </PdfView>
            </PdfView>
            <PdfView style={styles.reportInfo}>
              <PdfText style={styles.reportInfoItem}>Report Period: {data.period}</PdfText>
              <PdfText style={styles.reportInfoItem}>Generated: {dateString} at {timeString}</PdfText>
              <PdfText style={styles.reportInfoItem}>Document ID: {docId}</PdfText>
            </PdfView>
          </PdfView>
          
          <PdfView style={styles.generationInfo}>
            <PdfText>Automatically generated by NourishNow AI Assistant • Confidential © {generatedDate.getFullYear()}</PdfText>
          </PdfView>
        </PdfView>
        
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>1. Key Impact Metrics</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Food Waste Prevented</PdfText>
              <PdfText style={styles.metricValue}>{foodSavedKg.toLocaleString()} kg</PdfText>
              <PdfText style={styles.metricSubtitle}>{(foodSavedKg / 1000).toFixed(1)} metric tons</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>People Assisted</PdfText>
              <PdfText style={styles.metricValue}>{data.peopleHelped.toLocaleString()}</PdfText>
              <PdfText style={styles.metricSubtitle}>{mealsProvided.toLocaleString()} meals provided</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Total Users</PdfText>
              <PdfText style={styles.metricValue}>{data.totalUsers?.toLocaleString() || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>{data.activeUsers?.toLocaleString() || 'N/A'} approved users</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Active Donors</PdfText>
              <PdfText style={styles.metricValue}>{data.activeDonors.toLocaleString()}</PdfText>
              <PdfText style={styles.metricSubtitle}>Food contributing partners</PdfText>
            </PdfView>
          </PdfView>
          
          <PdfView style={{ marginTop: 10 }}>
            <PdfText style={[styles.metricTitle, { fontSize: 10.5, marginBottom: 8 }]}>User Engagement Breakdown</PdfText>
            
            <PdfView style={styles.userGrid}>
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Total Receivers</PdfText>
                <PdfText style={styles.userMetricValue}>{totalReceivers.toLocaleString()}</PdfText>
                <PdfText style={styles.metricSubtitle}>{activeReceivers.toLocaleString()} active</PdfText>
              </PdfView>
              
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Total Volunteers</PdfText>
                <PdfText style={styles.userMetricValue}>{totalVolunteers.toLocaleString()}</PdfText>
                <PdfText style={styles.metricSubtitle}>{activeVolunteers.toLocaleString()} active</PdfText>
              </PdfView>
              
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Receiver Engagement</PdfText>
                <PdfText style={styles.userMetricValue}>{receiverEngagementRate}</PdfText>
                <PdfText style={styles.metricSubtitle}>Active participation rate</PdfText>
              </PdfView>
            </PdfView>
            
            <PdfView style={styles.userGrid}>
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Volunteer Engagement</PdfText>
                <PdfText style={styles.userMetricValue}>{volunteerEngagementRate}</PdfText>
                <PdfText style={styles.metricSubtitle}>Active participation rate</PdfText>
              </PdfView>
              
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Completed Campaigns</PdfText>
                <PdfText style={styles.userMetricValue}>{data.completedCampaigns}</PdfText>
                <PdfText style={styles.metricSubtitle}>Food distribution events</PdfText>
              </PdfView>
              
              <PdfView style={styles.userMetricCard}>
                <PdfText style={styles.userMetricTitle}>Avg Participants</PdfText>
                <PdfText style={styles.userMetricValue}>{data.avgParticipantsPerCampaign || 'N/A'}</PdfText>
                <PdfText style={styles.metricSubtitle}>Per campaign</PdfText>
              </PdfView>
            </PdfView>
          </PdfView>
        </PdfView>
        
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>2. Environmental Impact</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Water Saved</PdfText>
              <PdfText style={styles.metricValue}>{data.waterSavedKL.toLocaleString()} kL</PdfText>
              <PdfText style={styles.metricSubtitle}>{(data.waterSavedKL * 1000).toLocaleString()} liters</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>CO₂ Emissions Reduced</PdfText>
              <PdfText style={styles.metricValue}>{data.co2ReducedTons.toFixed(1)} tons</PdfText>
              <PdfText style={styles.metricSubtitle}>Equivalent to {Math.round(foodSavedKg / 1000)} metric tons</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>
        
      </PdfPage>
      
      {/* PAGE 2: Platform Performance & Geographic Analysis */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header}>
          <PdfView style={styles.headerTop}>
            <PdfView style={styles.logoSection}>
              <PdfView style={{ 
                width: 36, 
                height: 36, 
                backgroundColor: PRIMARY_COLOR, 
                borderRadius: 3, 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <PdfText style={{ fontSize: 8, color: 'white' }}>Logo</PdfText>
              </PdfView>
              <PdfView>
                <PdfText style={styles.title}>Performance & Geographic Strategy</PdfText> 
                <PdfText style={styles.subtitle}>Food Redistribution Platform</PdfText>
              </PdfView>
            </PdfView>
            <PdfView style={styles.reportInfo}>
              <PdfText style={styles.reportInfoItem}>Document ID: {docId}</PdfText>
              <PdfText style={styles.reportInfoItem}>Report Period: {data.period}</PdfText>
              <PdfText style={styles.reportInfoItem}>Page 2</PdfText>
            </PdfView>
          </PdfView>
          
          <PdfView style={styles.generationInfo}>
            <PdfText>Automatically generated by NourishNow AI Assistant • Confidential © {generatedDate.getFullYear()}</PdfText>
          </PdfView>
        </PdfView>
        
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>3. Platform Performance</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Economic Value (RM)</PdfText>
              <PdfText style={styles.metricValue}>{data.economicValue}</PdfText>
              <PdfText style={styles.metricSubtitle}>Market value of food saved</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Utilization Rate</PdfText>
              <PdfText style={styles.metricValue}>{data.utilizationRate || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>Food collection efficiency</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Event Registrations</PdfText>
              <PdfText style={styles.metricValue}>{data.totalRegistrations.toLocaleString()}</PdfText>
              <PdfText style={styles.metricSubtitle}>Volunteer/Receiver sign-ups</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Total Reservations</PdfText>
              <PdfText style={styles.metricValue}>{data.totalReservations?.toLocaleString() || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>Food pickup bookings</PdfText>
            </PdfView>
          </PdfView>
          <PdfView style={styles.compactMetricRow}>
            <PdfView style={styles.compactMetricCard}>
              <PdfText style={styles.compactMetricTitle}>Top Donors</PdfText>
              <PdfText style={styles.compactMetricValue}>{data.topDonorsCount || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>High-contribution donors</PdfText>
            </PdfView>
            <PdfView style={styles.compactMetricCard}>
              <PdfText style={styles.compactMetricTitle}>Super Volunteers</PdfText>
              <PdfText style={styles.compactMetricValue}>{data.superVolunteersCount || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>Highly active volunteers</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>
        
        <PdfView style={styles.analysisSection}>
          <PdfText style={styles.sectionTitle}>4. Geographic Analysis</PdfText>
          {geoInsightElement}
          <PdfView style={styles.cityGrid}>
            <PdfView style={styles.cityCard}>
              <PdfText style={[styles.cityTitle, { color: '#f59e0b' }]}>HIGH NEED Candidates (Top 3)</PdfText>
              {(cityLists.need.length === 0) ? (
                <PdfText style={styles.cityMetric}>No cities flagged.</PdfText>
              ) : (
                cityLists.need.slice(0, 3).map((city, index) => 
                  <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>
                )
              )}
            </PdfView>
            <PdfView style={styles.cityCard}>
              <PdfText style={[styles.cityTitle, { color: '#ef4444' }]}>HIGH WASTE Risk (Top 3)</PdfText>
              {(cityLists.waste.length === 0) ? (
                <PdfText style={styles.cityMetric}>No cities flagged.</PdfText>
              ) : (
                cityLists.waste.slice(0, 3).map((city, index) => 
                  <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>
                )
              )}
            </PdfView>
            <PdfView style={styles.cityCard}>
              <PdfText style={[styles.cityTitle, { color: '#10b981' }]}>BEST COVERED Areas (Top 3)</PdfText>
              {(cityLists.best.length === 0) ? (
                <PdfText style={styles.cityMetric}>No cities flagged.</PdfText>
              ) : (
                cityLists.best.slice(0, 3).map((city, index) => 
                  <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>
                )
              )}
            </PdfView>
          </PdfView>
        </PdfView>
        
      </PdfPage>

      {/* PAGE 3: Detailed Analysis */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header}>
          <PdfView style={styles.headerTop}>
            <PdfView style={styles.logoSection}>
              <PdfView style={{ 
                width: 36, 
                height: 36, 
                backgroundColor: PRIMARY_COLOR, 
                borderRadius: 3, 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <PdfText style={{ fontSize: 8, color: 'white' }}>Logo</PdfText>
              </PdfView>
              <PdfView>
                <PdfText style={styles.title}>Detailed Analysis & Recommendations</PdfText> 
                <PdfText style={styles.subtitle}>Food Redistribution Platform</PdfText>
              </PdfView>
            </PdfView>
            <PdfView style={styles.reportInfo}>
              <PdfText style={styles.reportInfoItem}>Document ID: {docId}</PdfText>
              <PdfText style={styles.reportInfoItem}>Report Period: {data.period}</PdfText>
              <PdfText style={styles.reportInfoItem}>Page 3</PdfText>
            </PdfView>
          </PdfView>
          
          <PdfView style={styles.generationInfo}>
            <PdfText>Automatically generated by NourishNow AI Assistant • Confidential © {generatedDate.getFullYear()}</PdfText>
          </PdfView>
        </PdfView>
        
        <PdfView style={styles.analysisSection}>
          <PdfText style={styles.sectionTitle}>5. Analysis & Recommendations</PdfText>
          {analysisElements}
        </PdfView>
        
      </PdfPage>
    </PdfDocument>
  );
};