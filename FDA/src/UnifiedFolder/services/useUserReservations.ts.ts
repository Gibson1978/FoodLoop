// Create a new file: hooks/useUserReservations.ts
import { useState, useEffect } from 'react';
import { auth } from '../../Firebase/firebase';
import { getUserFoodReservations, getUserCampaignRegistrations } from '../../Firebase/reservationService';
import type { FoodReservation, CampaignRegistration } from '../../Firebase/reservationService';

export function useUserReservations() {
  const [foodReservations, setFoodReservations] = useState<FoodReservation[]>([]);
  const [campaignRegistrations, setCampaignRegistrations] = useState<CampaignRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshReservations = async () => {
    const user = auth.currentUser;
    if (!user) {
      setFoodReservations([]);
      setCampaignRegistrations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get food reservations
      const foodResult = await getUserFoodReservations();
      if (foodResult.success) {
        setFoodReservations(foodResult.data || []);
      }

      // Get campaign registrations
      const campaignResult = await getUserCampaignRegistrations();
      if (campaignResult.success) {
        setCampaignRegistrations(campaignResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshReservations();
  }, []);

  return {
    foodReservations,
    campaignRegistrations,
    loading,
    refreshReservations
  };
}