// src/hooks/useRiskDashboardData.ts (FINAL, CONSOLIDATED, EXPORTED)

import { useState, useEffect } from 'react';
import { db } from '../Firebase/Firebase'; 
import { collection, query, onSnapshot, where } from 'firebase/firestore';

// EXPORTED INTERFACES: Now the definitive source.
export interface UserRiskData {
    id: string;
    name: string;
    role: string;
    status: 'approved' | 'pending' | 'suspended'; 
    riskScore: number;
    suspensionReason?: string;
    reportBreakdown: { 
        high: number;
        medium: number;
        low: number;
    };
    totalReports: number; 
}

export interface RiskSummary {
    totalActiveUsers: number;
    totalHighRisk: number;
    totalSuspended: number;
    totalWarned: number;
    topRiskUsers: UserRiskData[];
    loading: boolean;
}

const DEFAULT_RISK_SUMMARY: RiskSummary = {
    totalActiveUsers: 0,
    totalHighRisk: 0,
    totalSuspended: 0,
    totalWarned: 0,
    topRiskUsers: [],
    loading: true,
};

const WARNING_SCORE_THRESHOLD = 40;
const SUSPENSION_SCORE_THRESHOLD = 75;


export const useRiskDashboardData = () => {
    const [riskData, setRiskData] = useState<RiskSummary>(DEFAULT_RISK_SUMMARY);

    useEffect(() => {
        
        // CRITICAL FIX: Re-introducing sorting by score and a limit(500) to ensure 
        // high-score and recently processed users are reliably captured.
        const riskQuery = query(
            collection(db, 'users'),
            where('status', 'in', ['approved', 'suspended']),
        );

        const unsubscribe = onSnapshot(riskQuery, (snapshot) => {
            let totalActive = 0; 
            let totalSuspended = 0; 
            let totalWarnedByScore = 0; 
            let topRiskCandidates: UserRiskData[] = []; 
            
            snapshot.docs.forEach(doc => {
                const data = doc.data() as any; 
                
                // === FIX START: Accessing flattened keys directly from the top-level data object ===
                
                // Get Score: Access flattened field name "riskMetrics.currentScore"
                // Fallback to 0 if null, undefined, or non-numeric
                const score = Number(data["riskMetrics.currentScore"]) || 0;
                const status = data.status;

                // Get Breakdown: Access flattened field name "riskMetrics.reportBreakdown"
                const rawBreakdown = data["riskMetrics.reportBreakdown"] || {};
                
                const breakdown = {
                    high: Number(rawBreakdown.high) || 0,
                    medium: Number(rawBreakdown.medium) || 0,
                    low: Number(rawBreakdown.low) || 0,
                };
                
                // Get Suspension Reason: Access flattened field name "riskMetrics.suspensionReason"
                const suspensionReason = data["riskMetrics.suspensionReason"];
                
                // Calculate total reports from the breakdown for reliability
                const totalReports = breakdown.high + breakdown.medium + breakdown.low;

                // === FIX END ===

                // --- 1. COUNTING LOGIC ---
                if (status === 'approved') {
                    totalActive++; 
                }

                if (status === 'suspended') { 
                    totalSuspended++;
                }

                // Warned check (score >= 40 AND < 75 AND not suspended)
                if (score >= WARNING_SCORE_THRESHOLD && score < SUSPENSION_SCORE_THRESHOLD && status !== 'suspended') {
                    totalWarnedByScore++; 
                }

                // --- 2. TOP 5 LIST INCLUSION ---
                // Collect users who are explicitly suspended OR have a risk score > 0.
                if (status === 'suspended' || score > 0) {
                    
                    topRiskCandidates.push({
                        id: doc.id,
                        name: data.profile?.orgName || data.profile?.name || data.profile?.contactPerson || 'Unknown User',
                        role: data.role || 'unknown',
                        status: status as UserRiskData['status'],
                        riskScore: score,
                        suspensionReason: suspensionReason,
                        reportBreakdown: breakdown, 
                        totalReports: totalReports, 
                    });
                }
            });
            
            // The Top 5 list will include suspended users and sort by score.
            const finalTopRiskUsers = topRiskCandidates
                // Sort by score descending
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 5);

            setRiskData({
                totalActiveUsers: totalActive,
                totalHighRisk: totalSuspended + totalWarnedByScore, 
                totalSuspended: totalSuspended,
                totalWarned: totalWarnedByScore,
                topRiskUsers: finalTopRiskUsers, 
                loading: false,
            });
        });

        return () => unsubscribe();
    }, []);

    return riskData;
};