// This will be used later for providing real data context to AI
export const dataService = {
  async getPlatformOverview() {
    // This will be implemented when we connect to Firestore
    return {
      totalDonations: 2847,
      activeNGOs: 45,
      totalUsers: 545,
      foodRedistributed: 156
    };
  },

  async getRecentMetrics() {
    // Mock data for now - will be replaced with real Firestore data
    return {
      weeklyDonations: 247,
      newRegistrations: 12,
      completionRate: 0.89,
      activeVolunteers: 85
    };
  }
};