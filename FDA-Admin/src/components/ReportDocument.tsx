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
  page: { padding: 30, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: PRIMARY_COLOR, paddingBottom: 10 },
  logoSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: HEADING_COLOR },
  subtitle: { fontSize: 12, color: '#666666', marginTop: 2 },
  reportInfo: { fontSize: 10, textAlign: 'right', color: '#666666' },
  reportInfoItem: { marginTop: 2 },
  section: { marginBottom: 20, padding: 15, backgroundColor: '#F7FBFB', borderRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: ACCENT_COLOR, paddingBottom: 5 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  metricCard: { width: '48%', padding: 12, backgroundColor: 'white', borderRadius: 5, borderWidth: 1, borderColor: ACCENT_COLOR, marginBottom: 10 },
  metricTitle: { fontSize: 12, fontWeight: 'bold', color: HEADING_COLOR, marginBottom: 5 },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: PRIMARY_COLOR },
  metricSubtitle: { fontSize: 10, color: '#666666' },
  analysisSection: { padding: 15, backgroundColor: '#E0F2F1', borderRadius: 5, marginTop: 10 },
  analysisText: { fontSize: 11, lineHeight: 1.5, color: '#333333', textAlign: 'justify' },
  aiHeading: { fontSize: 14, fontWeight: 'bold', color: HEADING_COLOR, marginTop: 10, marginBottom: 5 },
  aiSubHeading: { fontSize: 12, fontWeight: 'bold', color: HEADING_COLOR, marginTop: 8, marginBottom: 3, borderBottomWidth: 1, borderBottomColor: PRIMARY_COLOR, paddingBottom: 2, lineHeight: 1.5 },
  aiListItem: { fontSize: 11, marginLeft: 10, marginBottom: 3 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 9, color: '#666666', borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 10 },
  generatedBy: { fontSize: 10, color: PRIMARY_COLOR, marginTop: 5 },
  geoInsightBox: { padding: 10, backgroundColor: '#B2DFDB', borderRadius: 4, marginBottom: 10, marginTop: 5, borderLeftWidth: 5, borderLeftColor: PRIMARY_COLOR },
  geoInsightTitle: { fontSize: 11, fontWeight: 'bold', color: HEADING_COLOR, marginBottom: 3 },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  cityCard: { width: '32%', padding: 8, backgroundColor: 'white', borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 5 },
  cityTitle: { fontSize: 10, fontWeight: 'bold', color: PRIMARY_COLOR, marginBottom: 2 },
  cityMetric: { fontSize: 9, color: '#666666' }
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
        <PdfView key={`list-${elements.length}`} style={{ marginLeft: 10, marginBottom: 5 }}>
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
      return;
    }

    if (trimmedLine.startsWith('# ')) {
      flushList();
      inList = false;
      elements.push(<PdfText key={index} style={styles.aiHeading} break={elements.length > 0}>{trimmedLine.substring(2)}</PdfText>);
      return;
    }
    
    if (trimmedLine.startsWith('## ')) {
      flushList();
      inList = false;
      elements.push(<PdfText key={index} style={styles.aiSubHeading}>{trimmedLine.substring(3)}</PdfText>);
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
    elements.push(<PdfText key={index} style={styles.analysisText}>{cleanLine.trim()}</PdfText>);
  });
  flushList();
  return elements;
};

// Fixed to extract from RAW TEXT, not JSX elements
const extractGeoInsightRaw = (rawText: string) => {
  if (!rawText) return null;
  const problemMatch = rawText.match(/Problem\/Summary:(.*?)(?:Primary Action:|$)/s);
  const actionMatch = rawText.match(/Primary Action:(.*?)(?:###|$)/s);

  if (!problemMatch && !actionMatch) return null;

  return (
    <PdfView style={styles.geoInsightBox} break>
      <PdfText style={styles.geoInsightTitle}>CRITICAL GEOGRAPHIC ACTION</PdfText>
      <PdfText style={styles.analysisText}>
        <PdfText style={{ fontWeight: 'bold', color: '#004D40' }}>Problem/Summary: </PdfText>
        <PdfText>{problemMatch ? problemMatch[1].trim() : 'Details unavailable.'}</PdfText>
      </PdfText>
      <PdfText style={styles.analysisText}>
        <PdfText style={{ fontWeight: 'bold', color: '#004D40' }}>Primary Action: </PdfText>
        <PdfText>{actionMatch ? actionMatch[1].trim() : 'Details unavailable.'}</PdfText>
      </PdfText>
    </PdfView>
  );
};

// FIXED: Robust extraction from RAW TEXT
const extractCityListsRaw = (rawText: string, listName: string): string[] => {
  if (!rawText) return [];

  // Find the line that contains the list name (e.g., "* Best Covered Cities:")
  const lines = rawText.split('\n');
  const targetLine = lines.find(line => line.includes(listName) && line.includes(':'));

  if (!targetLine) return [];

  const defaultEmptyStrings = ['None identified', 'All regions stable', 'No major gaps identified', 'No standout regions'];
  
  // Extract everything after the colon
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
    analysis: string; // The raw string is key here
    
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
  };
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ data }) => {
  const analysisElements = formatAnalysisText(data.analysis);
  
  // Use new RAW extractors
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

  return (
    <PdfDocument>
      {/* PAGE 1 */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header} fixed>
          <PdfView style={styles.logoSection}>
            <PdfView style={{ width: 50, height: 50, backgroundColor: PRIMARY_COLOR, borderRadius: 5, justifyContent: 'center', alignItems: 'center' }}>
              <PdfText style={{ fontSize: 10, color: 'white' }}>Logo</PdfText>
            </PdfView>
            <PdfView>
              <PdfText style={styles.title}>NourishNow Impact Report</PdfText> 
              <PdfText style={styles.subtitle}>Food Redistribution Platform</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>
        <PdfView style={{ marginBottom: 20 }}>
          <PdfText style={styles.reportInfoItem}>Report Period: {data.period}</PdfText>
          <PdfText style={styles.reportInfoItem}>Generated: {dateString} at {timeString}</PdfText>
          <PdfText style={styles.reportInfoItem}>Document ID: NN-{generatedDate.getFullYear()}-{Math.random().toString(36).substr(2, 6).toUpperCase()}</PdfText>
        </PdfView>
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>1. Key Impact Metrics</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Food Waste Prevented</PdfText>
              <PdfText style={styles.metricValue}>{foodSavedKg.toLocaleString()} kg</PdfText>
              <PdfText style={styles.metricSubtitle}>Equivalent to {Math.round(foodSavedKg / 1000)} metric tons</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>People Assisted</PdfText>
              <PdfText style={styles.metricValue}>{data.peopleHelped.toLocaleString()}</PdfText>
              <PdfText style={styles.metricSubtitle}>{mealsProvided.toLocaleString()} meals provided</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Total Users</PdfText>
              <PdfText style={styles.metricValue}>{data.totalUsers?.toLocaleString() || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>{data.activeUsers?.toLocaleString() || 'N/A'} active users</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Active Donors</PdfText>
              <PdfText style={styles.metricValue}>{data.activeDonors}</PdfText>
              <PdfText style={styles.metricSubtitle}>Food contributing partners</PdfText>
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
              <PdfText style={styles.metricSubtitle}>Equivalent to {carsOffRoad} cars off road</PdfText>
            </PdfView>
          </PdfView>
        </PdfView>
        <PdfView style={styles.footer} fixed>
          <PdfText>This report was automatically generated by the NourishNow AI Assistant</PdfText>
          <PdfText style={styles.generatedBy}>Generated on {dateString} at {timeString}</PdfText>
          <PdfText>Confidential - © {generatedDate.getFullYear()} NourishNow Platform</PdfText>
        </PdfView>
      </PdfPage>
      
      {/* PAGE 2 */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header} fixed>
          <PdfText style={styles.title}>Performance & Geographic Strategy</PdfText>
          <PdfText style={{ fontSize: 10, color: '#666666' }}>Page 2</PdfText>
        </PdfView>
        <PdfView style={styles.section}>
          <PdfText style={styles.sectionTitle}>3. Platform Performance</PdfText>
          <PdfView style={styles.metricsGrid}>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Economic Value (RM)</PdfText>
              <PdfText style={styles.metricValue}>{data.economicValue}</PdfText>
              <PdfText style={styles.metricSubtitle}>Estimated market value of food saved</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Utilization Rate</PdfText>
              <PdfText style={styles.metricValue}>{data.utilizationRate || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>Efficiency of food collection</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Total Event Registrations</PdfText>
              <PdfText style={styles.metricValue}>{data.totalRegistrations.toLocaleString()}</PdfText>
              <PdfText style={styles.metricSubtitle}>Volunteer/Receiver sign-ups</PdfText>
            </PdfView>
            <PdfView style={styles.metricCard}>
              <PdfText style={styles.metricTitle}>Avg Participants/Campaign</PdfText>
              <PdfText style={styles.metricValue}>{data.avgParticipantsPerCampaign || 'N/A'}</PdfText>
              <PdfText style={styles.metricSubtitle}>Average engagement per event</PdfText>
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
                    cityLists.need.slice(0, 3).map((city, index) => <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>)
                )}
            </PdfView>
            <PdfView style={styles.cityCard}>
                <PdfText style={[styles.cityTitle, { color: '#ef4444' }]}>HIGH WASTE Risk (Top 3)</PdfText>
                {(cityLists.waste.length === 0) ? (
                    <PdfText style={styles.cityMetric}>No cities flagged.</PdfText>
                ) : (
                    cityLists.waste.slice(0, 3).map((city, index) => <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>)
                )}
            </PdfView>
            <PdfView style={styles.cityCard}>
                <PdfText style={[styles.cityTitle, { color: '#10b981' }]}>BEST COVERED Areas (Top 3)</PdfText>
                {(cityLists.best.length === 0) ? (
                    <PdfText style={styles.cityMetric}>No cities flagged.</PdfText>
                ) : (
                    cityLists.best.slice(0, 3).map((city, index) => <PdfText key={index} style={styles.cityMetric}>• {city}</PdfText>)
                )}
            </PdfView>
          </PdfView>
        </PdfView>
        <PdfView style={styles.footer} fixed>
          <PdfText>This report was automatically generated by the NourishNow AI Assistant</PdfText>
          <PdfText style={styles.generatedBy}>Generated on {dateString} at {timeString}</PdfText>
          <PdfText>Confidential - © {generatedDate.getFullYear()} NourishNow Platform</PdfText>
        </PdfView>
      </PdfPage>

      {/* PAGE 3 */}
      <PdfPage size="A4" style={styles.page}>
        <PdfView style={styles.header} fixed>
          <PdfText style={styles.title}>Detailed Analysis & Recommendations</PdfText>
          <PdfText style={{ fontSize: 10, color: '#666666' }}>Page 3</PdfText>
        </PdfView>
        <PdfView style={styles.analysisSection}>
          <PdfText style={styles.sectionTitle}>5. General Analysis & Recommendations</PdfText>
          {analysisElements}
        </PdfView>
        <PdfView style={styles.footer} fixed>
          <PdfText>This report was automatically generated by the NourishNow AI Assistant</PdfText>
          <PdfText style={styles.generatedBy}>Generated on {dateString} at {timeString}</PdfText>
          <PdfText>Confidential - © {generatedDate.getFullYear()} NourishNow Platform</PdfText>
        </PdfView>
      </PdfPage>
    </PdfDocument>
  );
};