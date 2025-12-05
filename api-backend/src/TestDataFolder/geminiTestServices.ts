// functions/src/geminiTestServices.ts - COMPLETE FIX
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as logger from "firebase-functions/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours cache

interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// FIXED Gemini Service with proper caching and donor-specific content
export class GeminiService {
  private model: any;
  private cache = responseCache;

  constructor(config: GeminiConfig = {}) {
    this.model = genAI.getGenerativeModel({ 
      model: config.model || "gemini-2.0-flash",
      generationConfig: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 350,
        topP: 0.8,
        topK: 40,
      }
    });
  }

  // ✅ FIXED CACHE: Use FULL prompt for cache key
  private generateCacheKey(prompt: string): string {
    return Buffer.from(prompt).toString('base64'); // REMOVED .substring(0, 50)
  }

  private getCachedResponse(key: string): string | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
    }
    return null;
  }

  private setCachedResponse(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  async generateContent(prompt: string, useCache = true): Promise<string> {
    try {
      // Check cache first
      if (useCache) {
        const cacheKey = this.generateCacheKey(prompt);
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          logger.info("Using cached Gemini response");
          return cached;
        }
      }

      if (!process.env.GEMINI_API_KEY) {
        logger.error("GEMINI_API_KEY is not set");
        throw new Error("API key not configured");
      }

      // Truncate very long prompts
      const truncatedPrompt = prompt.length > 3000 
        ? prompt.substring(0, 3000) + "...[truncated]" 
        : prompt;
      
      logger.info("Calling Gemini API...");
      
      const result = await this.model.generateContent(truncatedPrompt);
      const response = await result.response;
      
      if (!response || !response.text) {
        throw new Error("Empty response from Gemini API");
      }
      
      let text = response.text().trim();
      
      if (!text || text.length === 0) {
        throw new Error("Empty text response from Gemini API");
      }
      
      // Clean up Gemini's chatty responses
      text = text
        .replace(/^Here (is|are).*?\n/i, '')
        .replace(/^Option \d+[:.]?\s*/i, '')
        .replace(/^Title:\s*/i, '')
        .replace(/^Description:\s*/i, '')
        .replace(/^Instructions:\s*/i, '')
        .replace(/^"|"$/g, '')
        .replace(/^Sure.*?\n/i, '')
        .trim();
      
      // Cache the response
      if (useCache) {
        const cacheKey = this.generateCacheKey(prompt);
        this.setCachedResponse(cacheKey, text);
      }
      
      logger.info("Gemini response received successfully");
      return text;
    } catch (error: unknown) {
      logger.error("Gemini API error:", error);
      throw error;
    }
  }

  // Food title generation - IMPROVED with strict context
  async generateFoodTitle(donor: any, foodCategory: string, imageName: string): Promise<string> {
    const prompt = `
Generate ONE specific food title for a Malaysian food donation item.

**CRITICAL CONTEXT**: 
- Donor: ${donor.name} (${donor.type})
- Category: ${foodCategory}
- Image clue: ${imageName}

**EXAMPLES**:
- KFC Malaysia, Cooked Meals → "Spicy Dinner Plate Set @ KFC"
- Econsave, Fresh Produce → "Fresh Vegetable Harvest Bundle"
- Hilton Kuala Lumpur, Cooked Meals → "International Buffet Selection"

**STRICT RULES**:
1. Title MUST mention ${donor.name}
2. Title MUST match ${donor.type} (${donor.specialties?.join(', ')})
3. Max 8 words
4. NO quotes, NO "Here is", NO "Option 1"

Generate title for ${donor.name}, ${foodCategory}:`;

    const response = await this.generateContent(prompt);
    
    // Extra cleanup to ensure proper title
    return response
      .split('\n')[0]
      .replace(/^["']|["']$/g, '')
      .replace(/^(Title|Name):\s*/i, '')
      .trim();
  }

  // Food description - IMPROVED with proper donor context
  async generateFoodDescription(title: string, donor: any, foodCategory: string, imageName: string): Promise<string> {
    const prompt = `
Write ONE appetizing description for this food donation.

**ITEM DETAILS**:
- Title: ${title}
- Donor: ${donor.name} (${donor.type})
- Category: ${foodCategory}

**DESCRIPTION RULES**:
1. Write 2 sentences about the food quality
2. Mention ${donor.name} specifically
3. Use Malaysian adjectives: sedap, fresh, halal, enak
4. Sound appetizing but professional
5. NO placeholder text like [[NAME]] - use the actual name: ${donor.name}

Example for KFC:
"This delicious crispy chicken set from KFC Malaysia features perfectly seasoned fried chicken with golden fries. Freshly prepared and halal-certified for immediate enjoyment."

Now describe ${title} from ${donor.name}:`;

    const response = await this.generateContent(prompt);
    
    // Ensure donor name is properly included
    if (!response.includes(donor.name)) {
      return `${response} This quality food is provided by ${donor.name}.`;
    }
    
    return response;
  }

  // Campaign description - IMPROVED
  async generateCampaignDescription(ngo: any, campaignTemplate: any): Promise<string> {
    const prompt = `
Write an inspiring campaign description for a Malaysian charity.

**CAMPAIGN DETAILS**:
- Title: ${campaignTemplate.title}
- Organization: ${ngo.name}
- Category: ${campaignTemplate.category}
- Location: Klang Valley, Malaysia

**DESCRIPTION RULES**:
1. Write 3 sentences maximum
2. Focus on B40 families and community support
3. Mention ${ngo.name} specifically
4. Sound inspiring and actionable
5. NO placeholder text - use actual name: ${ngo.name}

Example:
"${ngo.name} is launching this food drive to support underprivileged families in the Klang Valley. We aim to distribute essential groceries and cooked meals to those facing food insecurity. Join us in making a difference and ensuring no one in our community goes hungry."

Write description for ${campaignTemplate.title}:`;

    return await this.generateContent(prompt);
  }

  // Pickup instructions - IMPROVED
  async generatePickupInstructions(
    donor: any, 
    contactPerson: string, 
    startTime?: string, 
    endTime?: string
  ): Promise<string> {
    const timeInfo = startTime && endTime ? ` between ${startTime} and ${endTime}` : '';
    
    const prompt = `
Write clear pickup instructions for a Malaysian ${donor.type}.

**LOCATION DETAILS**:
- Donor: ${donor.name}
- Contact: ${contactPerson}
- Time:${timeInfo}

**INSTRUCTION RULES**:
1. Write 2-3 clear instructions
2. Mention ${donor.name} location
3. Include contact person: ${contactPerson}
4. Use Malaysian polite terms (Terima kasih, sila)
5. Sound professional but friendly

Example for restaurant:
"Please proceed to ${donor.name} and ask for ${contactPerson} at the main counter. Your food will be freshly packed and ready for collection. Terima kasih for supporting food recovery!"

Write instructions for ${donor.name}:`;

    const response = await this.generateContent(prompt);
    return response;
  }

  // Report description - FIXED
  async generateReportDescription(
    targetType: string, 
    targetName: string, 
    reason: string, 
    severity: string,
    reportedUserName: string,
    additionalContext = "Context: Food donation incident in Malaysia."
  ): Promise<string> {
    const prompt = `
Write a formal incident report description.

**INCIDENT DETAILS**:
- Type: ${targetType}
- Target: ${targetName}
- Issue: ${reason}
- Severity: ${severity}
- Reported by: ${reportedUserName}

**REPORT RULES**:
1. Write 2 factual sentences
2. Be professional and serious
3. Describe the issue clearly
4. NO opinions or judgments
5. Use formal business language

Example:
"The ${targetType} '${targetName}' failed to comply with pickup scheduling on three separate occasions. This behavior has caused operational delays and wasted donor resources."

Write report:`;

    return await this.generateContent(prompt);
  }

  // Rating comment - FIXED
  async generateRatingComment(
    targetType: string,
    targetName: string,
    isPositive: boolean,
    rating: number,
    targetEntity?: any
  ): Promise<string> {
    const tone = isPositive ? "positive and appreciative" : "constructive and helpful";
    
    const prompt = `
Write a short Malaysian-style review.

**RATING DETAILS**:
- Item: ${targetName}
- Rating: ${rating}/5
- Type: ${targetType}
- Sentiment: ${tone}

**REVIEW RULES**:
1. Use Manglish (sedap, best, lambat sikit)
2. Max 12 words
3. Sound authentic and local
4. ${isPositive ? 'Be enthusiastic' : 'Be polite but critical'}

Examples:
- Positive: "Food was very sedap! Packaging pun cantik. Will order again!"
- Constructive: "Food arrived lambat sikit, but still okay lah. Maybe improve delivery time."

Write review:`;

    return await this.generateContent(prompt);
  }

  // Individual food title generation
  async generateIndividualFoodTitle(donor: any, category: string, imageName: string): Promise<string> {
    // Use the improved food title method
    return this.generateFoodTitle(donor, category, imageName);
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = "Respond with exactly the word 'SUCCESS' and nothing else.";
      const response = await this.generateContent(testPrompt, false); // Don't cache test
      const isSuccess = response.trim() === 'SUCCESS';
      
      logger.info(`Gemini connection test: ${isSuccess ? 'SUCCESS' : 'FAILED'} (Response: "${response}")`);
      return isSuccess;
    } catch (error) {
      logger.error("Gemini connection test failed:", error);
      return false;
    }
  }
}

// Fallback content - UPDATED with proper mapping
export const FALLBACK_CONTENT = {
  foodTitles: {
    // Restaurants - FIXED mapping
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

    // Hypermarkets - FIXED mapping
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

    // Hotels - FIXED mapping
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

  foodDescriptions: {
    "KFC Malaysia": [
      "Freshly prepared crispy chicken meals from KFC Malaysia, perfect for immediate consumption. Each box contains a complete meal with sides.",
      "Hot and spicy chicken pieces from KFC, cooked to perfection and ready for pickup. Ideal for families or group sharing.",
      "Zinger burger combo packs featuring juicy chicken patties with fresh vegetables and signature sauces. Comes with fries and drink."
    ],
    "McDonald's": [
      "Big Mac meals with fresh beef patties and special sauce from McDonald's. Properly packaged and maintained at safe temperatures.",
      "Chicken McNuggets share boxes with various dipping sauces. Perfect for quick meals or events requiring finger food.",
      "Filet-O-Fish burgers with sustainable fish fillets and tartar sauce. A popular choice for seafood lovers."
    ],
    "Econsave": [
      "Budget-friendly grocery bundles from Econsave featuring essential food items at affordable prices. Great for families on tight budgets.",
      "Local produce selection including fresh vegetables and fruits sourced from Malaysian farms. Supporting local agriculture.",
      "Household essentials pack with cooking oil, rice, and basic condiments. Everything needed for daily cooking."
    ],
    "Secret Recipe": [
      "Signature chocolate cake slices from Secret Recipe, rich and decadent. Perfect for desserts or special occasions.",
      "Grilled chicken pasta sets with creamy sauce and fresh herbs. Restaurant-quality meals ready for distribution.",
      "Assorted pastries including croissants, muffins, and tarts. Baked fresh and suitable for breakfast or tea time."
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
    "fast-food": "Please proceed to the service counter and ask for [CONTACT_PERSON]. Your food will be ready for pickup. Staff will assist you with collection.",
    "restaurant": "Kindly approach the main entrance and request [CONTACT_PERSON] at the front desk. Your order will be prepared and waiting for you.",
    "supermarket": "Go to the customer service desk and mention your food rescue pickup. [CONTACT_PERSON] will assist you with loading.",
    "hotel": "Use the service entrance and check with security. Ask for [CONTACT_PERSON] who will guide you to the pickup area.",
    "default": "Please arrive at the establishment and ask for [CONTACT_PERSON]. They will assist you with the food collection between [TIME]."
  },
  
  reportDescriptions: {
    food: {
      "Poor quality": "The food items received were stale and showed signs of spoilage. Several packages were damaged and leaking.",
      "Late delivery": "The pickup was delayed by over 2 hours without notification. This caused scheduling conflicts.",
      "Missing items": "Several items listed in the reservation were not included in the pickup. Only received partial order.",
      "Unhygienic packaging": "Food was packaged in unsanitary containers. Some items were not properly sealed."
    },
    campaign: {
      "Poor organization": "The event started 45 minutes late and volunteers seemed unprepared. Activities were disorganized.",
      "No show": "The organizer did not arrive at the scheduled time. Volunteers waited for over an hour.",
      "Unprofessional behavior": "Staff were rude to participants and unwilling to answer questions about the event.",
      "Late start": "The campaign began 90 minutes behind schedule without proper communication."
    },
    user: {
      "Rude behavior": "The individual was aggressive and disrespectful to other participants during the event.",
      "No show for pickup": "Failed to arrive for scheduled pickup three times without cancellation or notification.",
      "Aggressive demanding": "Demanded more than allocated portion and became confrontational when refused.",
      "Multiple cancellations": "Cancelled reservations at the last minute on five separate occasions."
    }
  },

  ratingComments: {
    positive: [
      "The food was fresh, well-packaged, and exactly as described. Very satisfied with the quality!",
      "Excellent communication and smooth pickup process. The food was delicious and perfectly portioned.",
      "High-quality ingredients and generous portions. Will definitely participate in future pickups!",
      "Professional service and delicious food. Everything was fresh and ready on time.",
      "Great initiative helping reduce food waste. The meals were tasty and well-prepared."
    ],
    constructive: [
      "Food was good but arrived slightly later than expected. Quality was still acceptable.",
      "Portion sizes were adequate but some items could have been fresher. Overall okay experience.",
      "Communication could be improved but the food itself was decent. Would try again.",
      "Pickup location was a bit confusing to find. Once found, the process was smooth.",
      "Food quality was average. Could benefit from better packaging to maintain freshness."
    ]
  },
};