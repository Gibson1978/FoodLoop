// functions/src/geocodeAddress.ts
import * as functions from "firebase-functions";

interface GeocodeRequest {
  address: string;
}

interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const geocodeAddress = functions.https.onCall(
  async (request: functions.https.CallableRequest<GeocodeRequest>): Promise<GeocodeResponse> => {
    // 1. Validate authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    // 2. Validate input
    const {address} = request.data;
    if (!address || typeof address !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Address is required and must be a string"
      );
    }

    try {
      // 3. Get API key from environment (updated for Firebase v12+)
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("Google Maps API key not configured");
        throw new functions.https.HttpsError(
          "internal",
          "Geocoding service not configured"
        );
      }

      // 4. Call Google Maps API using fetch
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${
          encodeURIComponent(address)
        }&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // 5. Process response
      if (result.status === "OK" && result.results[0]) {
        const location = result.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.results[0].formatted_address,
        };
      } else if (result.status === "ZERO_RESULTS") {
        throw new functions.https.HttpsError(
          "not-found",
          "Address not found. Please check the address and try again."
        );
      } else {
        throw new functions.https.HttpsError(
          "internal",
          `Geocoding failed: ${result.status}`
        );
      }
    } catch (error: any) {
      console.error("Geocoding error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Geocoding service temporarily unavailable"
      );
    }
  }
);