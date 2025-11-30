// functions/src/geminiServices.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiService {
  private model: any;

  constructor(config: GeminiConfig = {}) {
    this.model = genAI.getGenerativeModel({ 
      model: config.model || "gemini-2.0-flash", // CHANGED: Stable model
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 500,
      }
    });
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      // Check if API key is available
      if (!process.env.GEMINI_API_KEY) {
        logger.error("GEMINI_API_KEY is not set in environment variables");
        throw new Error("API key not configured");
      }

      logger.info("Calling Gemini API with prompt:", prompt.substring(0, 100) + "...");
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      if (!response || !response.text) {
        throw new Error("Empty response from Gemini API");
      }
      
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error("Empty text response from Gemini API");
      }
      
      logger.info("Gemini response received successfully");
      return text.trim();
    } catch (error: unknown) {
      logger.error("Gemini API error details:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Food title generation
  async generateFoodTitle(donor: any, foodCategory: string): Promise<string> {
    const prompt = `
Generate a specific, appealing food title for a food redistribution app in Malaysia.

ESTABLISHMENT: ${donor.name} (${donor.type})
SPECIALTIES: ${donor.specialties.join(', ')}
FOOD CATEGORY: ${foodCategory}
LOCATION: ${donor.locations[0]}, Malaysia

Generate ONE specific food title that this establishment would realistically have as surplus.
Make it sound authentic and appealing. Return ONLY the title, no explanations.

Examples:
- "Freshly Grilled Peri-Peri Chicken Quarter"
- "Nasi Lemak with Crispy Fried Chicken Set" 
- "Assorted Pastries and Croissants Box"

Generate one title:`;

    return await this.generateContent(prompt);
  }

  // Food description generation - UPDATED LENGTH
  async generateFoodDescription(title: string, donor: any, foodCategory: string): Promise<string> {
    const prompt = `
Write a compelling food description (4-5 lines maximum) for a food redistribution platform in Malaysia.

FOOD TITLE: ${title}
ESTABLISHMENT: ${donor.name}
ESTABLISHMENT TYPE: ${donor.type}
FOOD CATEGORY: ${foodCategory}

Describe the food briefly in one paragraph. Focus on quality and purpose. Keep it to 4-5 lines maximum.`;

    return await this.generateContent(prompt);
  }

  // Campaign description generation - UPDATED LENGTH
  async generateCampaignDescription(ngo: any, campaignTemplate: any): Promise<string> {
    const prompt = `
Write a compelling campaign description (4-5 lines maximum) for a community food distribution event in Malaysia.

ORGANIZATION: ${ngo.name} (${ngo.type} organization)
CAMPAIGN TITLE: ${campaignTemplate.title}
CAMPAIGN CATEGORY: ${campaignTemplate.category}

Describe the campaign briefly in one paragraph. Keep it to 4-5 lines maximum. Make it inspiring and community-focused.`;

    return await this.generateContent(prompt);
  }

  // Pickup instructions generation - UPDATED LENGTH & FORMAT
  async generatePickupInstructions(donor: any, contactPerson: string): Promise<string> {
    const prompt = `
Generate clear, concise pickup instructions for collecting surplus food in Malaysia. Keep it to 4-5 lines maximum.

ESTABLISHMENT: ${donor.name}
ESTABLISHMENT TYPE: ${donor.type}
CONTACT PERSON: ${contactPerson}

Provide simple, human-like instructions without markdown formatting. Just plain text.

Focus on:
- Where to go
- Who to ask for  
- Basic procedure
- Any special notes

Make it friendly and easy to follow.`;

    return await this.generateContent(prompt);
  }

  // Report description generation - UPDATED LENGTH
  async generateReportDescription(
    targetType: string, 
    targetName: string, 
    reason: string, 
    severity: string,
    reportedUserName: string
  ): Promise<string> {
    const prompt = `
Write a concise report description (2-3 lines, one paragraph) from a user's perspective.

REPORT TYPE: ${targetType}
TARGET: ${targetName}
REASON: ${reason}
SEVERITY: ${severity}
REPORTED USER/ORGANIZATION: ${reportedUserName}

Briefly describe what happened in natural language. Keep it to 2-3 sentences maximum. Sound authentic and concerned.`;

    return await this.generateContent(prompt);
  }

  // Rating comment generation - UPDATED LENGTH
  async generateRatingComment(
    targetType: string,
    targetName: string,
    isPositive: boolean,
    rating: number
  ): Promise<string> {
    const tone = isPositive ? "positive and appreciative" : "constructive and helpful";
    
    const prompt = `
Write a ${tone} review comment (1-2 sentences maximum) for a ${targetType}.

TARGET: ${targetName}
RATING: ${rating}/5

Keep it very short and authentic. Just 1-2 simple sentences. Make it sound like real human feedback.`;

    return await this.generateContent(prompt);
  }

  // Add this method to your GeminiService class
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = "Respond with just the word 'SUCCESS' if you can read this.";
      const response = await this.generateContent(testPrompt);
      const isSuccess = response.trim() === 'SUCCESS';
      
      logger.info(`Gemini connection test: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
      return isSuccess;
    } catch (error) {
      logger.error("Gemini connection test failed:", error);
      return false;
    }
  }
}



// Fallback content in case Gemini fails
export const FALLBACK_CONTENT = {
  foodTitles: {
    // Restaurants
    "KFC Malaysia": [
      "Crispy Fried Chicken Meal Box",
      "Zinger Burger Combo Pack",
      "Hot & Spicy Chicken Pieces",
      "Family Bucket Meal",
      "Snack Plate with Fries"
    ],
    "McDonald's": [
      "Big Mac Meal Package",
      "Chicken McNuggets Share Box",
      "Filet-O-Fish Burger Set",
      "Breakfast McMuffin Assortment",
      "Happy Meal Surplus Pack"
    ],
    "Pizza Hut": [
      "Supreme Pizza Large",
      "Cheese Lovers Pan Pizza",
      "Pasta Meal Combo",
      "Garlic Bread Sticks",
      "Mixed Pizza Variety Box"
    ],
    "Nando's": [
      "Peri-Peri Chicken Quarter Meal",
      "Flame-Grilled Chicken Platter",
      "Portuguese Spicy Wraps",
      "Grilled Chicken & Rice Set",
      "Chicken Livers & Portuguese Roll"
    ],
    "PappaRich": [
      "Nasi Lemak with Fried Chicken Set",
      "Roti Canai with Curry Combo",
      "Hainanese Chicken Rice Meal",
      "Char Kuey Teow Pack",
      "Curry Laksa Bowl"
    ],
    "The Chicken Rice Shop": [
      "Steamed Chicken Rice Set",
      "Roasted Chicken Rice Combo",
      "Mixed Chicken Rice Platter",
      "Chicken Noodle Soup Bowl",
      "Special Chicken Rice Family Pack"
    ],
    "Secret Recipe": [
      "Chocolate Indulgence Cake Slice",
      "Grilled Chicken Pasta Set",
      "Beef Lasagna Meal",
      "Mixed Pastries Assortment",
      "Creamy Carbonara Pack"
    ],
    "OldTown White Coffee": [
      "Kopi O Breakfast Set",
      "Nasi Lemak Special Pack",
      "Kaya Toast Combo",
      "Curry Mee Bowl",
      "White Coffee & Snack Pack"
    ],

    // Hypermarkets
    "AEON BiG": [
      "Fresh Vegetable Harvest Basket",
      "Mixed Fruits Collection",
      "Rice & Cooking Essentials Pack",
      "Canned Goods Variety Box",
      "Bakery Fresh Bread Assortment"
    ],
    "Giant Hypermarket": [
      "Daily Grocery Essentials Pack",
      "Fresh Produce Selection",
      "Household Staples Bundle",
      "Snacks & Beverages Box",
      "Frozen Food Variety Pack"
    ],
    "Tesco": [
      "International Foods Selection",
      "Fresh Meat & Seafood Pack",
      "Organic Produce Basket",
      "Baking Essentials Kit",
      "Ready-to-Eat Meals Assortment"
    ],
    "NSK Trade City": [
      "Bulk Rice & Grains Pack",
      "Local Produce Special",
      "Affordable Groceries Bundle",
      "Spices & Condiments Set",
      "Household Value Pack"
    ],
    "Econsave": [
      "Budget Groceries Bundle",
      "Local Products Selection",
      "Essential Food Items Pack",
      "Daily Necessities Box",
      "Value Deals Assortment"
    ],
    "Mydin": [
      "Muslim-Friendly Groceries",
      "Local Products Variety",
      "Wholesale Essentials Pack",
      "Halal Food Selection",
      "Bulk Purchase Bundle"
    ],

    // Hotels
    "Hilton Kuala Lumpur": [
      "International Buffet Selection",
      "Wedding Banquet Leftovers",
      "Conference Lunch Packages",
      "Breakfast Pastry Assortment",
      "Five-Course Dinner Surplus"
    ],
    "Sheraton Imperial": [
      "Business Lunch Buffet",
      "Event Catering Surplus",
      "International Cuisine Selection",
      "Dessert & Pastry Collection",
      "Corporate Dinner Packages"
    ],
    "Le Meridien Kuala Lumpur": [
      "French Cuisine Selection",
      "Luxury Dining Leftovers",
      "Event Catering Packages",
      "Gourmet Pastry Assortment",
      "Fine Dining Experience Pack"
    ],
    "Concorde Hotel Shah Alam": [
      "Local Cuisine Buffet",
      "Business Event Leftovers",
      "Traditional Malay Dishes",
      "Conference Meal Packages",
      "Banquet Food Selection"
    ],
    "Glenmarie Hotel & Golf Resort": [
      "Resort Breakfast Buffet",
      "Golf Event Catering",
      "Outdoor BBQ Leftovers",
      "Family Dining Packages",
      "Recreation Meal Selection"
    ],
    "One World Hotel": [
      "Chinese Banquet Leftovers",
      "Corporate Event Packages",
      "International Buffet Selection",
      "Wedding Dinner Surplus",
      "Business Lunch Assortment"
    ],
    "Sunway Resort Hotel": [
      "Theme Park Catering Pack",
      "Family Buffet Leftovers",
      "Large Event Surplus",
      "Kids Meal Packages",
      "Resort Dining Selection"
    ],
    "Royale Chulan Kuala Lumpur": [
      "Malay Traditional Banquet",
      "Cultural Event Leftovers",
      "Royal Dining Experience",
      "Heritage Cuisine Pack",
      "Traditional Dessert Collection"
    ]
  },

  campaignDescriptions: {
    "Community Outreach": [
      "Weekly food distribution program supporting underprivileged families in our local community with essential food items and nutritious meals.",
      "Join us in providing food assistance to families in need through our regular community outreach initiatives.",
      "Helping bridge the food gap for vulnerable communities through sustainable distribution programs."
    ],
    "Elderly Support": [
      "Specialized food assistance program focusing on nutritional needs of senior citizens, including home delivery services.",
      "Ensuring our elderly community members receive proper nutrition and food security support.",
      "Dedicated program addressing the unique dietary requirements of senior citizens in our community."
    ],
    "Education Support": [
      "Providing nutritious meals to school children from low-income families to support their learning and development.",
      "School lunch program ensuring children have access to healthy meals for better educational outcomes.",
      "Supporting young learners through regular meal distributions at educational institutions."
    ],
    "Festival Program": [
      "Special festive season food drive ensuring everyone can celebrate traditional holidays with proper meals.",
      "Bringing festive cheer through food distributions during major cultural and religious celebrations.",
      "Seasonal food assistance program supporting communities during important cultural festivities."
    ],
    "Emergency Relief": [
      "Rapid response food assistance for communities affected by emergencies, disasters, or unexpected crises.",
      "Emergency food relief operations providing immediate support during times of crisis.",
      "Disaster response initiative delivering essential food supplies to affected communities quickly."
    ]
  },

  pickupInstructions: {
    "fast-food": "Please proceed to the drive-thru window and mention your food reservation. Staff will have your order prepared and ready for collection.",
    "restaurant": "Kindly approach the main counter and ask for the manager. Your food will be freshly packed and waiting for pickup.",
    "cafe": "Please ring the service bell at the counter and present your reservation details. Items will be available at the pickup counter.",
    "hypermarket": "Proceed to customer service counter with your reservation confirmation. Staff will assist with your grocery collection.",
    "hotel": "Use the service entrance and check with security. Food will be packed in temperature-controlled containers for freshness.",
    "default": "Please approach the main counter and provide your reservation details for food collection."
  },

  ratingComments: {
    positive: [
      "The food was fresh and exactly as described. Very generous portions!",
      "Excellent communication and smooth pickup process. Highly recommended!",
      "Quality exceeded expectations. Will definitely participate again.",
      "Professional service and delicious food. Perfect for our family.",
      "Great initiative helping the community. Food was still warm and tasty."
    ],
    constructive: [
      "Food was good but could use less salt. Otherwise great quality!",
      "Pickup time was slightly delayed but the food was worth the wait.",
      "Good portion sizes but labeling could be clearer for dietary needs.",
      "Tasty food though the pickup location was a bit hard to find.",
      "Overall good experience, would appreciate more variety next time."
    ]
  }
};