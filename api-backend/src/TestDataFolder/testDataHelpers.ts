// functions/src/testDataHelpers.ts - COMPLETE REWRITE
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { faker } from "@faker-js/faker";
import { GeminiService, FALLBACK_CONTENT } from "./geminiTestServices";
import { TEST_IMAGE_URLS } from "./testImageUrl";
import { 
  getDonorAddress, 
  getVolunteerAddress, 
  getRandomCampaignLocation, 
  formatAddress, 
  generateReceiverAddress,
  Address, 
  CampaignLocation 
} from "./testAddressMapping";

export const db = admin.firestore();
export const storage = admin.storage();
const geminiService = new GeminiService();

// ========== INTERFACES ==========
export interface UserData {
  uid: string;
  email: string;
  role: 'donor' | 'volunteer' | 'receiver';
  profile: {
    name?: string;
    orgName?: string;
    orgType?: 'restaurant' | 'supermarket' | 'grocery' | 'hotel' | 'ngo';
    contactPerson?: string;
    phone: string;
    address: Address;
  };
  status: 'pending' | 'approved' | 'rejected';
  verification: {
    documentUrl: string;
    verified: boolean;
    documentUploaded: boolean;
    uploadedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isTestData: boolean;
  testPassword?: string;
  dietaryRestrictions?: string[];
  familySize?: number;
}

export interface FoodListingData {
  id?: string;
  title: string;
  description: string;
  category: string;
  totalQuantity: number;
  quantityUnit: string;
  remainingQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  expiryDate: string;
  tags: string[];
  pickupAddress: string;
  pickupInstructions: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  images: string[];
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorType: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  rating: number;
  totalRatings: number;
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isTestData: boolean;
}

export interface CampaignData {
  id?: string;
  title: string;
  description: string;
  category: string;
  campaignDate: string;
  startTime: string;
  endTime: string;
  locationName: string;
  fullAddress: string;
  totalSpots: number;
  registeredSpots: number;
  availableSpots: number;
  images: string[];
  status: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  organizerOrg: string;
  rating: number;
  totalRatings: number;
  geolocation?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isTestData: boolean;
}

// ========== MALAYSIAN BUSINESSES ==========
export const MALAYSIAN_DONORS = {
  restaurants: [
    { 
      name: "KFC Malaysia", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Petaling Jaya", "Subang Jaya"],
      specialties: ["Fried Chicken", "Burgers", "Fast Food"],
      categories: ["Cooked Meals"],
      imageKey: "KFC Malaysia"
    },
    { 
      name: "McDonald's", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Shah Alam", "Klang"],
      specialties: ["Burgers", "Fries", "Breakfast"],
      categories: ["Cooked Meals"],
      imageKey: "McDonald's"
    },
    { 
      name: "Pizza Hut", 
      type: "restaurant", 
      locations: ["Petaling Jaya", "Kuala Lumpur"],
      specialties: ["Pizza", "Pasta", "Italian"],
      categories: ["Cooked Meals"],
      imageKey: "Pizza Hut"
    },
    { 
      name: "Nando's", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Petaling Jaya"],
      specialties: ["Grilled Chicken", "Portuguese", "Flame-grilled"],
      categories: ["Cooked Meals"],
      imageKey: "Nando's"
    },
    { 
      name: "PappaRich", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Malaysian Food", "Nasi Lemak", "Roti Canai"],
      categories: ["Cooked Meals"],
      imageKey: "PappaRich"
    },
    { 
      name: "The Chicken Rice Shop", 
      type: "restaurant", 
      locations: ["Petaling Jaya", "Klang"],
      specialties: ["Chicken Rice", "Chinese Food", "Rice Dishes"],
      categories: ["Cooked Meals"],
      imageKey: "The Chicken Rice Shop"
    },
    { 
      name: "Secret Recipe", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Subang Jaya"],
      specialties: ["Cakes", "Western Food", "Pasta"],
      categories: ["Cooked Meals"],
      imageKey: "Secret Recipe"
    },
    { 
      name: "OldTown White Coffee", 
      type: "restaurant", 
      locations: ["Shah Alam", "Klang"],
      specialties: ["Kopitiam Food", "White Coffee", "Local Dishes"],
      categories: ["Cooked Meals"],
      imageKey: "OldTown White Coffee"
    },
  ],
  supermarkets: [
    { 
      name: "AEON BiG", 
      type: "supermarket", 
      locations: ["Shah Alam", "Kuala Lumpur", "Petaling Jaya"],
      specialties: ["Groceries", "Fresh Produce", "Shelf-stable"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "AEON BiG"
    },
    { 
      name: "Giant Hypermarket", 
      type: "supermarket", 
      locations: ["Shah Alam", "Subang Jaya", "Klang"],
      specialties: ["Groceries", "Household Items", "Fresh Food"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "Giant Hypermarket"
    },
    { 
      name: "Tesco", 
      type: "supermarket", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Groceries", "International Foods", "Fresh Produce"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "Tesco"
    },
    { 
      name: "NSK Trade City", 
      type: "supermarket", 
      locations: ["Shah Alam", "Petaling Jaya"],
      specialties: ["Bulk Items", "Local Produce", "Affordable Groceries"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "NSK Trade City"
    },
    { 
      name: "Econsave", 
      type: "grocery", 
      locations: ["Klang", "Subang Jaya"],
      specialties: ["Budget Groceries", "Local Products", "Household Essentials"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "Econsave"
    },
    { 
      name: "Mydin", 
      type: "grocery", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Wholesale", "Local Products", "Muslim-friendly"],
      categories: ["Fresh Produce", "Shelf-stable"],
      imageKey: "Mydin"
    },
  ],
  hotels: [
    { 
      name: "Hilton Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Buffet", "International Cuisine", "Banquet"],
      categories: ["Cooked Meals"],
      imageKey: "Hilton Kuala Lumpur"
    },
    { 
      name: "Sheraton Imperial", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Wedding Banquet", "Conference Catering", "International"],
      categories: ["Cooked Meals"],
      imageKey: "Sheraton Imperial"
    },
    { 
      name: "Le Meridien Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["French Cuisine", "Luxury Dining", "Event Catering"],
      categories: ["Cooked Meals"],
      imageKey: "Le Meridien Kuala Lumpur"
    },
    { 
      name: "Concorde Hotel Shah Alam", 
      type: "hotel", 
      locations: ["Shah Alam"],
      specialties: ["Local Cuisine", "Business Events", "Banquet"],
      categories: ["Cooked Meals"],
      imageKey: "Concorde Hotel Shah Alam"
    },
    { 
      name: "Glenmarie Hotel & Golf Resort", 
      type: "hotel", 
      locations: ["Shah Alam"],
      specialties: ["Resort Dining", "Golf Events", "Outdoor Catering"],
      categories: ["Cooked Meals"],
      imageKey: "Glenmarie Hotel & Golf Resort"
    },
    { 
      name: "One World Hotel", 
      type: "hotel", 
      locations: ["Petaling Jaya"],
      specialties: ["Chinese Banquet", "Corporate Events", "International Buffet"],
      categories: ["Cooked Meals"],
      imageKey: "One World Hotel"
    },
    { 
      name: "Sunway Resort Hotel", 
      type: "hotel", 
      locations: ["Petaling Jaya"],
      specialties: ["Theme Park Catering", "Large Events", "Family Dining"],
      categories: ["Cooked Meals"],
      imageKey: "Sunway Resort Hotel"
    },
    { 
      name: "Royale Chulan Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Malay Cuisine", "Traditional Banquet", "Cultural Events"],
      categories: ["Cooked Meals"],
      imageKey: "Royale Chulan Kuala Lumpur"
    },
  ]
};

export const MALAYSIAN_NGOS = [
  { name: "Malaysian Red Crescent Society", type: "ngo", imageKey: "Malaysian Red Crescent Society" },
  { name: "Pertubuhan Kebajikan Islam Malaysia", type: "ngo", imageKey: "Pertubuhan Kebajikan Islam Malaysia" },
  { name: "Rumah Kebajikan Seri Eden", type: "ngo", imageKey: "Rumah Kebajikan Seri Eden" },
  { name: "Food Aid Foundation", type: "ngo", imageKey: "Food Aid Foundation" },
  { name: "Kechara Soup Kitchen", type: "ngo", imageKey: "Kechara Soup Kitchen" },
  { name: "Pertiwi Soup Kitchen", type: "ngo", imageKey: "Pertiwi Soup Kitchen" },
  { name: "Yayasan Sunbeams Home", type: "ngo", imageKey: "Yayasan Sunbeams Home" },
  { name: "Project Hope Malaysia", type: "ngo", imageKey: "Project Hope Malaysia" },
  { name: "Yayasan MSU", type: "ngo", imageKey: "Yayasan MSU" },
];

// ========== FOOD CATEGORIES ==========
export const FOOD_CATEGORIES = {
  COOKED_MEALS: { 
    items: ["Cooked Meals"], 
  },
  FRESH_PRODUCE: { 
    items: ["Fresh Produce"], 
  },
  SHELF_STABLE: { 
    items: ["Shelf stable"], 
  }
};

// ========== HELPER FUNCTIONS ==========
function cleanGeminiResponse(text: string, realName?: string): string {
  if (!text) return "";
  
  // Use realName or empty string if undefined
  const nameToUse = realName || '';
  
  let cleaned = text
    .replace(/\[\[NAME\]\]/gi, nameToUse)
    .replace(/\[NAME\]/gi, nameToUse)
    .replace(/Donor's Establishment/gi, nameToUse)
    .replace(/Sample Restaurant/gi, nameToUse)
    .replace(/The Organization/gi, nameToUse)
    .replace(/Here (is|are).*?(:|\n)/i, '')
    .replace(/^(Title|Description|Instructions|Option \d+):\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  
  // Ensure the real name is mentioned at least once if provided
  if (realName && !cleaned.includes(realName)) {
    cleaned = cleaned.replace(/\.$/, `. Provided by ${realName}.`);
  }
  
  return cleaned;
}

function getDonorImages(donorName: string): string[] {
  const imageMapping: Record<string, string[]> = {
    // Restaurants
    "KFC Malaysia": ["crispy_chicken_meal", "zinger_burger_combo", "hot_spicy_chicken", "family_bucket", "snack_plate_fries"],
    "McDonald's": ["big_mac_meal", "chicken_mcnuggets", "filet_o_fish", "breakfast_mcmuffin", "happy_meal"],
    "Pizza Hut": ["supreme_pizza", "cheese_lovers_pizza", "pasta_meal_combo", "garlic_bread_sticks", "mixed_pizza_variety"],
    "Nando's": ["peri_peri_chicken", "grilled_chicken_platter", "flame_grilled_wraps", "portuguese_rice_meal", "spicy_chicken_quarters"],
    "PappaRich": ["nasi_lemak_set", "roti_canai_combo", "chicken_rice_meal", "char_kuey_teow", "curly_laksa_bowl"],
    "The Chicken Rice Shop": ["steamed_chicken_rice", "roasted_chicken_combo", "mixed_chicken_platter", "chicken_noodle_soup", "family_chicken_pack"],
    "Secret Recipe": ["chocolate_cake_slice", "grilled_chicken_pasta", "beef_lasagna_meal", "pastry_assortment", "creamy_carbonara"],
    "OldTown White Coffee": ["kopi_breakfast_set", "nasi_lemak_pack", "kaya_toast_combo", "curry_mee_bowl", "white_coffee_snack"],
    
    // Supermarkets
    "AEON BiG": ["fresh_vegetables_basket", "mixed_fruits_collection", "rice_essentials_pack", "canned_goods_variety", "bakery_bread_assortment"],
    "Giant Hypermarket": ["grocery_essentials_pack", "fresh_produce_selection", "household_staples_bundle", "snacks_beverages_box", "frozen_food_variety"],
    "Tesco": ["international_foods_selection", "fresh_meat_seafood", "organic_produce_basket", "baking_essentials_kit", "ready_eat_meals"],
    "NSK Trade City": ["bulk_rice_grains", "local_produce_special", "affordable_groceries_bundle", "spices_condiments_set", "household_value_pack"],
    "Econsave": ["budget_groceries_bundle", "local_products_selection", "essential_food_items", "daily_necessities_box", "value_deals_assortment"],
    "Mydin": ["muslim_friendly_groceries", "local_products_variety", "wholesale_essentials_pack", "halal_food_selection", "bulk_purchase_bundle"],
    
    // Hotels
    "Hilton Kuala Lumpur": ["international_buffet_selection", "wedding_banquet_leftovers", "conference_lunch_packages", "breakfast_pastry_assortment", "fine_dining_surplus"],
    "Sheraton Imperial": ["business_lunch_buffet", "event_catering_surplus", "international_cuisine_selection", "dessert_pastry_collection", "corporate_dinner_packages"],
    "Le Meridien Kuala Lumpur": ["french_cuisine_selection", "luxury_dining_leftovers", "event_catering_packages", "gourmet_pastry_assortment", "fine_dining_experience"],
    "Concorde Hotel Shah Alam": ["local_cuisine_buffet", "business_event_leftovers", "traditional_malay_dishes", "conference_meal_packages", "banquet_food_selection"],
    "Glenmarie Hotel & Golf Resort": ["resort_breakfast_buffet", "golf_event_catering", "outdoor_bbq_leftovers", "family_dining_packages", "recreation_meal_selection"],
    "One World Hotel": ["chinese_banquet_leftovers", "corporate_event_packages", "international_buffet_selection", "wedding_dinner_surplus", "business_lunch_assortment"],
    "Sunway Resort Hotel": ["theme_park_catering_pack", "family_buffet_leftovers", "large_event_surplus", "kids_meal_packages", "resort_dining_selection"],
    "Royale Chulan Kuala Lumpur": ["malay_traditional_banquet", "cultural_event_leftovers", "royal_dining_experience", "heritage_cuisine_pack", "traditional_dessert_collection"]
  };

  return imageMapping[donorName] || ["default_food"];
}

function getNgoImages(ngoName: string): string[] {
  const imageMapping: Record<string, string[]> = {
    "Malaysian Red Crescent Society": ["emergency_food_distribution", "community_kitchen_setup", "disaster_relief_effort"],
    "Pertubuhan Kebajikan Islam Malaysia": ["religious_food_distribution", "community_support_program", "ramadan_food_packages"],
    "Rumah Kebajikan Seri Eden": ["community_food_drive", "local_family_support", "neighborhood_assistance"],
    "Food Aid Foundation": ["food_bank_operations", "surplus_food_collection", "community_grocery_distribution"],
    "Kechara Soup Kitchen": ["soup_kitchen_operations", "street_feeding_program", "homeless_food_assistance"],
    "Pertiwi Soup Kitchen": ["soup_kitchen_service", "night_food_distribution", "urban_poor_support"],
    "Project Hope Malaysia": ["hope_food_distribution", "community_empowerment", "sustainable_food_program"],
    "Yayasan MSU": ["educational_food_support", "student_meal_program", "campus_food_assistance"]
  };

  return imageMapping[ngoName] || ["default_campaign"];
}

function getFoodTitlesFallback(donorName: string): string[] {
  const fallbackTitles = FALLBACK_CONTENT.foodTitles[donorName as keyof typeof FALLBACK_CONTENT.foodTitles];
  return fallbackTitles || [`Food Pack from ${donorName}`];
}

function getFoodDescriptionFallback(donorName: string): string {
  const descriptions = FALLBACK_CONTENT.foodDescriptions[donorName as keyof typeof FALLBACK_CONTENT.foodDescriptions];
  if (descriptions && descriptions.length > 0) {
    return faker.helpers.arrayElement(descriptions);
  }
  return `Fresh food items from ${donorName}. Properly packaged and ready for collection.`;
}

function getPickupInstructionsFallback(donorType: string, donorName: string, contactPerson: string): string {
  const instructions = FALLBACK_CONTENT.pickupInstructions[donorType as keyof typeof FALLBACK_CONTENT.pickupInstructions];
  const defaultInstructions = FALLBACK_CONTENT.pickupInstructions.default;
  
  const template = instructions || defaultInstructions;
  return template
    .replace('[CONTACT_PERSON]', contactPerson)
    .replace('[TIME]', '10:00 AM - 8:00 PM')
    .replace(/\[\[NAME\]\]/g, donorName);
}

function getCampaignDescriptionsFallback(category: string): string[] {
  const descriptions = FALLBACK_CONTENT.campaignDescriptions[category as keyof typeof FALLBACK_CONTENT.campaignDescriptions];
  return descriptions || [`Campaign for ${category}`];
}

function getDonorImageUrl(donorName: string, imageName: string): string {
  const donors = TEST_IMAGE_URLS.donors as Record<string, Record<string, string>>;
  return donors[donorName]?.[imageName] || TEST_IMAGE_URLS.fallbacks.food_fallback;
}

function getNgoImageUrl(ngoName: string, imageName: string): string {
  const ngos = TEST_IMAGE_URLS.ngos as Record<string, Record<string, string>>;
  return ngos[ngoName]?.[imageName] || TEST_IMAGE_URLS.fallbacks.campaign_fallback;
}

function getDocumentImageUrl(docType: string, imageName: string): string {
  const documents = TEST_IMAGE_URLS.documents as Record<string, Record<string, string>>;
  return documents[docType]?.[imageName] || TEST_IMAGE_URLS.fallbacks.document_fallback;
}

function getEvidenceImageUrl(imageName: string): string {
  const evidence = TEST_IMAGE_URLS.evidence as Record<string, string>;
  return evidence[imageName] || TEST_IMAGE_URLS.fallbacks.evidence_fallback;
}

// ========== ENHANCED GEMINI RETRY FUNCTION ==========
const AI_CALL_DELAY = 500;

export async function callGeminiWithRetry<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  maxRetries = 2,
  delay = 500
): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, AI_CALL_DELAY));
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`Gemini attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : String(error));
      
      if (attempt === maxRetries) {
        logger.warn("All Gemini attempts failed, using fallback");
        return fallback();
      }
      
      const waitTime = delay * attempt;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  return fallback();
}

// ========== 1. UPDATED USER GENERATION WITH FIXED STATUS ==========
export async function generateUsers(count: number): Promise<UserData[]> {
  const users: UserData[] = [];
  
  const allDonors = [
    ...MALAYSIAN_DONORS.restaurants,
    ...MALAYSIAN_DONORS.supermarkets,
    ...MALAYSIAN_DONORS.hotels
  ];

  const shuffledDonors = faker.helpers.shuffle([...allDonors]);
  const shuffledNgos = faker.helpers.shuffle([...MALAYSIAN_NGOS]);

  // ✅ FIXED: Adjusted ratios: More receivers (60%), fewer donors/volunteers
  const donorCount = Math.max(3, Math.floor(count * 0.2)); // 20% donors (at least 3)
  const volunteerCount = Math.max(3, Math.floor(count * 0.2)); // 20% volunteers (at least 3)
  const receiverCount = Math.max(4, count - donorCount - volunteerCount); // 60% receivers (at least 4)

  logger.info(`Generating ${count} users: ${donorCount} donors, ${volunteerCount} volunteers, ${receiverCount} receivers`);

  // ✅ FIXED: Simplified status distribution
  const getStatus = (role: string, index: number, totalInRole: number): 'pending' | 'approved' | 'rejected' => {
    // First user in each role: pending (for demo)
    if (index === 0) return 'pending';
    
    // Second user: rejected
    if (index === 1 && totalInRole > 2) return 'rejected';
    
    // All others: approved (ensuring we have enough approved users)
    return 'approved';
  };

  let userIndex = 0;

  // 1. GENERATE DONORS
  for (let i = 0; i < donorCount; i++) {
    const donorTemplate = shuffledDonors[i % shuffledDonors.length];
    const isDuplicate = i >= shuffledDonors.length;
    const orgName = isDuplicate ? `${donorTemplate.name} ${Math.floor(i / shuffledDonors.length) + 1}` : donorTemplate.name;
    
    const location = faker.helpers.arrayElement(donorTemplate.locations);
    const cleanName = donorTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `donor_${cleanName}_${i}_${Date.now()}@test.com`;
    
    const status = getStatus('donor', i, donorCount);
    
    const address = getDonorAddress(donorTemplate.name, location) || {
      street: faker.location.streetAddress(),
      city: location,
      postalCode: faker.location.zipCode(),
      state: "Selangor",
      latitude: faker.location.latitude({ min: 2.5, max: 3.5 }),
      longitude: faker.location.longitude({ min: 101, max: 102 })
    };

    const docImages = ["business_license_1", "business_license_2", "business_license_3"];
    const selectedDoc = faker.helpers.arrayElement(docImages);

    const userData: Omit<UserData, 'uid'> = {
      email,
      role: 'donor',
      profile: {
        orgName,
        orgType: donorTemplate.type as any,
        contactPerson: faker.person.fullName(),
        phone: `01${faker.string.numeric({ length: 8 })}`,
        address
      },
      status,
      verification: {
        documentUrl: getDocumentImageUrl("business-license", selectedDoc),
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past(),
      updatedAt: new Date(),
      isTestData: true
    };

    try {
      const user = await createUserWithAuth(userData, userIndex++, "password123");
      
      // If rejected, move to rejectedUsers collection
      if (status === 'rejected') {
        const rejectedAt = new Date();
        const rejectedBy = 'IVTkF3TYQ7QLVBbbpeHTdQe1QKC2';
        const rejectionReason = "Registration rejected by admin";
        
        const rejectedUserData = {
          ...user,
          rejectedAt,
          rejectedBy,
          rejectionReason
        };
        
        await db.collection('rejectedUsers').doc(user.uid).set(rejectedUserData);
        await db.collection('users').doc(user.uid).delete();
        
        logger.info(`Moved rejected donor to rejectedUsers: ${user.email}`);
      } else {
        users.push(user);
      }
    } catch (e) {
      logger.error("Failed to create donor:", e);
    }
  }

  // 2. GENERATE VOLUNTEERS
  for (let i = 0; i < volunteerCount; i++) {
    const ngoTemplate = shuffledNgos[i % shuffledNgos.length];
    const isDuplicate = i >= shuffledNgos.length;
    const orgName = isDuplicate ? `${ngoTemplate.name} ${Math.floor(i / shuffledNgos.length) + 1}` : ngoTemplate.name;
    
    const email = `vol_${ngoTemplate.name.split(' ')[0].toLowerCase()}_${i}_${Date.now()}@test.com`;
    
    const status = getStatus('volunteer', i, volunteerCount);
    
    let address = getVolunteerAddress(ngoTemplate.name)?.officeAddress;
    if (!address) {
      const city = "Kuala Lumpur";
      address = {
        street: faker.location.streetAddress(),
        city,
        postalCode: faker.location.zipCode(),
        state: "Kuala Lumpur",
        latitude: faker.location.latitude({ min: 2.5, max: 3.5 }),
        longitude: faker.location.longitude({ min: 101, max: 102 })
      };
    }

    const docImages = ["ngo_certificate_1", "ngo_certificate_2", "ngo_certificate_3"];
    const selectedDoc = faker.helpers.arrayElement(docImages);

    const userData: Omit<UserData, 'uid'> = {
      email,
      role: 'volunteer',
      profile: {
        orgName,
        orgType: 'ngo',
        contactPerson: faker.person.fullName(),
        phone: `01${faker.string.numeric({ length: 8 })}`,
        address
      },
      status,
      verification: {
        documentUrl: getDocumentImageUrl("ngo-certificate", selectedDoc),
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past(),
      updatedAt: new Date(),
      isTestData: true
    };

    try {
      const user = await createUserWithAuth(userData, userIndex++, "password123");
      
      // If rejected, move to rejectedUsers collection
      if (status === 'rejected') {
        const rejectedAt = new Date();
        const rejectedBy = 'IVTkF3TYQ7QLVBbbpeHTdQe1QKC2';
        const rejectionReason = "Registration rejected by admin";
        
        const rejectedUserData = {
          ...user,
          rejectedAt,
          rejectedBy,
          rejectionReason
        };
        
        await db.collection('rejectedUsers').doc(user.uid).set(rejectedUserData);
        await db.collection('users').doc(user.uid).delete();
        
        logger.info(`Moved rejected volunteer to rejectedUsers: ${user.email}`);
      } else {
        users.push(user);
      }
    } catch (e) {
      logger.error("Failed to create volunteer:", e);
    }
  }

  // 3. GENERATE RECEIVERS
  for (let i = 0; i < receiverCount; i++) {
    const email = `receiver_${i}_${Date.now()}@test.com`;
    
    const status = getStatus('receiver', i, receiverCount);
    
    const dietaryOptions = ['halal', 'vegetarian', 'vegan', 'no-pork', 'no-beef', 'diabetic-friendly'];
    const dietaryRestrictions = faker.helpers.arrayElements(
      dietaryOptions, 
      faker.number.int({ min: 0, max: 3 })
    );

    const docImages = ["id_card_1", "id_card_2", "id_card_3"];
    const selectedDoc = faker.helpers.arrayElement(docImages);

    const userData: Omit<UserData, 'uid'> = {
      email,
      role: 'receiver',
      profile: {
        name: faker.person.fullName(),
        phone: `01${faker.string.numeric({ length: 8 })}`,
        address: generateReceiverAddress()
      },
      status,
      verification: {
        documentUrl: getDocumentImageUrl("id-card", selectedDoc),
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past(),
      updatedAt: new Date(),
      isTestData: true,
      dietaryRestrictions,
      familySize: faker.number.int({ min: 1, max: 8 })
    };

    try {
      const user = await createUserWithAuth(userData, userIndex++, "password123");
      
      // If rejected, move to rejectedUsers collection
      if (status === 'rejected') {
        const rejectedAt = new Date();
        const rejectedBy = 'IVTkF3TYQ7QLVBbbpeHTdQe1QKC2';
        const rejectionReason = "Registration rejected by admin";
        
        const rejectedUserData = {
          ...user,
          rejectedAt,
          rejectedBy,
          rejectionReason
        };
        
        await db.collection('rejectedUsers').doc(user.uid).set(rejectedUserData);
        await db.collection('users').doc(user.uid).delete();
        
        logger.info(`Moved rejected receiver to rejectedUsers: ${user.email}`);
      } else {
        users.push(user);
      }
    } catch (e) {
      logger.error("Failed to create receiver:", e);
    }
  }

  // Verify status distribution
  const finalApprovedDonors = users.filter(u => u.role === 'donor' && u.status === 'approved').length;
  const finalApprovedVolunteers = users.filter(u => u.role === 'volunteer' && u.status === 'approved').length;
  const finalApprovedReceivers = users.filter(u => u.role === 'receiver' && u.status === 'approved').length;
  const finalPending = users.filter(u => u.status === 'pending').length;
  const finalRejected = users.filter(u => u.status === 'rejected').length;
  const totalInUsers = users.length;

  logger.info(`✅ User status distribution: 
    - Approved: ${finalApprovedDonors} donors, ${finalApprovedVolunteers} volunteers, ${finalApprovedReceivers} receivers
    - Pending: ${finalPending} total
    - Rejected: ${finalRejected} total (moved to rejectedUsers)`);
  logger.info(`Created ${totalInUsers} users in users collection`);
  
  return users;
}

export async function createUserWithAuth(
  userData: Omit<UserData, 'uid'>,
  index: number, 
  password: string
): Promise<UserData> {
  try {
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: password,
      displayName: userData.profile.name || userData.profile.contactPerson || userData.profile.orgName,
      disabled: userData.status === 'rejected', // Only disable rejected users
    });

    const userWithUid: UserData = {
      ...userData,
      uid: userRecord.uid,
      testPassword: password
    };

    // Only save to users collection if not rejected
    if (userData.status !== 'rejected') {
      await db.collection('users').doc(userRecord.uid).set(userWithUid);
    }
    
    logger.info(`Created ${userData.role} user: ${userData.email} (Status: ${userData.status})`);
    return userWithUid;
  } catch (error: any) {
    logger.error(`Failed to create user ${index}:`, error);
    throw error;
  }
}

// ========== TEMPLATE FUNCTIONS ==========
interface FoodTemplate {
  title: string;
  description: string;
  pickupInstructions: string;
  category: string;
  tags: string[];
  startTime: string;
  endTime: string;
}

interface CampaignTemplate {
  title: string;
  description: string;
  category: string;
}

let foodTemplatesCache: Map<string, FoodTemplate[]> | null = null;
let campaignTemplatesCache: CampaignTemplate[] | null = null;

export async function generateFoodTemplates(): Promise<Map<string, FoodTemplate[]>> {
  if (foodTemplatesCache) return foodTemplatesCache;

  const templates = new Map<string, FoodTemplate[]>();
  const keyCategories = ['Cooked Meals', 'Fresh Produce', 'Shelf-stable'];

  // Use fallback templates for now to avoid API calls
  for (const category of keyCategories) {
    const categoryTemplates: FoodTemplate[] = [];
    
    for (let i = 0; i < 3; i++) {
      const contactPerson = "the manager";
      
      const title = `Fresh ${category} Pack ${i + 1}`;
      const description = `High-quality ${category.toLowerCase()} from a local establishment. Halal certified and ready for distribution.`;
      const pickupInstructions = `Please collect from the establishment at the designated pickup area. Ask for ${contactPerson}.`;
      
      categoryTemplates.push({
        title,
        description,
        pickupInstructions,
        category,
        tags: [category.toLowerCase(), 'halal', 'malaysian'],
        startTime: '10:00',
        endTime: '18:00'
      });
    }
    
    templates.set(category, categoryTemplates);
  }
  
  foodTemplatesCache = templates;
  logger.info(`Generated ${templates.size} food template categories`);
  return templates;
}

export async function generateCampaignTemplates(): Promise<CampaignTemplate[]> {
  if (campaignTemplatesCache) return campaignTemplatesCache;

  const templates: CampaignTemplate[] = [];
  
  const types = [
    {title: "Community Food Distribution Drive", category: "Mixed Items"},
    {title: "Fresh Produce Program", category: "Fresh Produce"},
    {title: "Hot Meal Service", category: "Cooked Meals"},
    {title: "Emergency Food Relief", category: "Emergency Relief"},
    {title: "Weekly Food Support", category: "Mixed Items"},
    {title: "Elderly Nutrition Program", category: "Targeted Support"},
    {title: "School Meal Initiative", category: "Education Support"},
    {title: "Festival Food Drive", category: "Community Outreach"}
  ];
  
  // Use fallback descriptions
  for (const t of types) {
    const fallbackDescs = getCampaignDescriptionsFallback(t.category);
    
    templates.push({
      title: t.title, 
      description: faker.helpers.arrayElement(fallbackDescs), 
      category: t.category
    });
  }
  
  campaignTemplatesCache = templates;
  logger.info(`Generated ${templates.length} campaign templates`);
  return templates;
}

// ========== 2. UPDATED FOOD LISTING GENERATION WITH FIXED MAPPING ==========
export async function generateFoodListingsOptimized(
  count: number,
  users: UserData[],
  pastMonths: number,
  futureDays: number
): Promise<string[]> {
  const donors = users.filter((u) => u.role === "donor" && u.status === "approved");
  if (donors.length === 0) {
    logger.warn("No approved donors found for food listings");
    return [];
  }

  const foodTemplates = await generateFoodTemplates();
  const listings: string[] = [];
  
  // ✅ FIXED: Reduced pending count, increased completed
  let approvedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let completedCount = 0;
  const targetApproved = faker.number.int({ min: 8, max: 12 }); // 8-12 approved
  const targetPending = faker.number.int({ min: 3, max: 5 }); // Only 2-4 pending (reduced)
  const targetCancelled = faker.number.int({ min: 3, max: 5 }); // 3-5 cancelled

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - pastMonths);
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + futureDays);

  logger.info(`Generating ${count} food listings with quotas: ${targetApproved} approved, ${targetPending} pending, ${targetCancelled} cancelled`);

  const maxAICalls = Math.min(count, 50);
  let aiCallCount = 0;
  const useAI = Array(count).fill(false);
  const aiTargetCount = Math.floor(count * 0.3);
  for (let i = 0; i < aiTargetCount; i++) useAI[i] = true;
  faker.helpers.shuffle(useAI);

  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < count; i++) {
  const donor = donors[i % donors.length];
  
  // FIXED DONOR MATCHING LOGIC - Use exact matching
  const allDonors = [
    ...MALAYSIAN_DONORS.restaurants,
    ...MALAYSIAN_DONORS.supermarkets,
    ...MALAYSIAN_DONORS.hotels
  ];
  
  // Find donor by matching the name (handle duplicate suffixes)
  const orgName = donor.profile.orgName || "";
  let donorDetails = allDonors.find(d => {
    const cleanOrgName = orgName.replace(/\s+\d+$/, ''); // Remove trailing numbers like "KFC Malaysia 1"
    
    // Try exact match first
    if (cleanOrgName === d.name) return true;
    
    // Then try partial match
    if (cleanOrgName.includes(d.name) || d.name.includes(cleanOrgName.split(' ')[0])) {
      return true;
    }
    
    return false;
  });

  // If still not found, try matching by type
  if (!donorDetails) {
    const donorType = donor.profile.orgType;
    donorDetails = allDonors.find(d => d.type === donorType);
  }

  // Last resort: use first donor
  if (!donorDetails) {
    logger.warn(`Could not find donor details for: ${orgName}, using fallback`);
    donorDetails = allDonors[0];
  }

  const category = selectFoodCategory(donorDetails.type);
  const templateList = foodTemplates.get(category);
  
  let title: string;
  let description: string;
  let pickupInstructions: string;
  let tags: string[] = [];
  
  const shouldUseAI = useAI[i] && aiCallCount < maxAICalls;
  const contactName = donor.profile.contactPerson || 'Staff';

  // CONTENT GENERATION WITH PROPER MAPPING
  if (shouldUseAI) {
    // AI MODE - FIXED TO ACTUALLY USE AI
    aiCallCount++;
    if (aiCallCount > 1 && aiCallCount % 3 === 0) await new Promise(r => setTimeout(r, 800));

    const donorImages = getDonorImages(donorDetails.name);
    const selectedImage = faker.helpers.arrayElement(donorImages);
    
    try {
      const titleResult = await callGeminiWithRetry(
        async () => {
          return await geminiService.generateIndividualFoodTitle(donorDetails, category, selectedImage);
        },
        () => {
          const fallbackTitles = getFoodTitlesFallback(donorDetails.name);
          return faker.helpers.arrayElement(fallbackTitles);
        },
        1,
        500
      );
      
      title = titleResult;
      
      const descriptionResult = await callGeminiWithRetry(
        async () => {
          return await geminiService.generateFoodDescription(title, donorDetails, category, selectedImage);
        },
        () => getFoodDescriptionFallback(donorDetails.name),
        1,
        500
      );
      
      description = descriptionResult;
      
      const pickupResult = await callGeminiWithRetry(
        async () => {
          return await geminiService.generatePickupInstructions(donorDetails, contactName);
        },
        () => getPickupInstructionsFallback(donorDetails.type, donorDetails.name, contactName),
        1,
        500
      );
      
      pickupInstructions = pickupResult;

      // ✅ FIXED: Provide default empty string if orgName is undefined
      title = cleanGeminiResponse(title, orgName || donorDetails.name);
      description = cleanGeminiResponse(description, orgName || donorDetails.name);
      pickupInstructions = cleanGeminiResponse(pickupInstructions, orgName || donorDetails.name);
      
    } catch (error) {
      // Fallback on any error
      const fallbackTitles = getFoodTitlesFallback(donorDetails.name);
      title = faker.helpers.arrayElement(fallbackTitles);
      description = getFoodDescriptionFallback(donorDetails.name);
      pickupInstructions = getPickupInstructionsFallback(donorDetails.type, donorDetails.name, contactName);
    }
    
    tags = generateFoodTags(category, donorDetails.type, donorDetails.specialties || []);
  } else if (templateList && templateList.length > 0) {
    // TEMPLATE MODE - ACTUALLY USE TEMPLATES
    const template = faker.helpers.arrayElement(templateList);
    title = template.title.replace(/Local Restaurant/g, donorDetails.name);
    description = template.description.replace(/local establishment/g, donorDetails.name);
    pickupInstructions = template.pickupInstructions.replace(/the establishment/g, donorDetails.name);
    tags = [...template.tags];
  } else {
    // FALLBACK MODE (NO AI, NO TEMPLATE)
    const fallbackTitles = getFoodTitlesFallback(donorDetails.name);
    title = faker.helpers.arrayElement(fallbackTitles);
    description = getFoodDescriptionFallback(donorDetails.name);
    pickupInstructions = getPickupInstructionsFallback(donorDetails.type, donorDetails.name, contactName);
    tags = generateFoodTags(category, donorDetails.type, donorDetails.specialties || []);
  }

  // Clean up any remaining placeholders - use donorDetails.name as fallback
  const displayName = orgName || donorDetails.name;
  title = title.replace(/\[\[NAME\]\]/g, displayName).trim();
  description = description.replace(/\[\[NAME\]\]/g, displayName).trim();
  pickupInstructions = pickupInstructions.replace(/\[\[NAME\]\]/g, displayName).trim();

  // IMAGE SELECTION
  const donorImages = getDonorImages(donorDetails.name);
  const selectedImage = faker.helpers.arrayElement(donorImages);
  const imageUrl = getDonorImageUrl(donorDetails.name, selectedImage);

    // FIXED STATUS LOGIC WITH QUOTAS
    let status: 'pending' | 'approved' | 'completed' | 'cancelled';
    let availableDate: Date;

    if (approvedCount < targetApproved) {
      status = 'approved';
      availableDate = faker.date.between({ from: now, to: futureDate });
      approvedCount++;
    } else if (pendingCount < targetPending) {
      status = 'pending';
      availableDate = faker.date.between({ from: now, to: futureDate });
      pendingCount++;
    } else if (cancelledCount < targetCancelled) {
      status = 'cancelled';
      availableDate = faker.date.between({ from: pastDate, to: now });
      cancelledCount++;
    } else {
      // Everything else is completed
      status = 'completed';
      availableDate = faker.date.between({ from: pastDate, to: now });
      completedCount++;
    }

    const totalQuantity = faker.number.int({ min: 10, max: 150 });
    let reservedQuantity = 0;
    let collectedQuantity = 0;

    if (status === "completed") {
      // Only reserve 40-70% of total quantity (not all)
      reservedQuantity = faker.number.int({ 
        min: Math.ceil(totalQuantity * 0.4), 
        max: Math.ceil(totalQuantity * 0.7) 
      });
      // Only collect 80-100% of reserved quantity (not all collected)
      collectedQuantity = faker.number.int({ 
        min: Math.ceil(reservedQuantity * 0.8), 
        max: reservedQuantity 
      });
    } else if (status === "approved") {
      reservedQuantity = faker.number.int({ min: 0, max: Math.floor(totalQuantity * 0.4) });
      collectedQuantity = 0;
    } else if (status === "pending") {
      reservedQuantity = 0;
      collectedQuantity = 0;
    }

    const remainingQuantity = totalQuantity - reservedQuantity;

    const foodData: FoodListingData = {
      title: title.replace(/Here are.*/i, '').trim(),
      description: description.replace(/Here are.*/i, '').trim(),
      category,
      totalQuantity,
      quantityUnit: "units",
      remainingQuantity,
      reservedQuantity,
      collectedQuantity,
      expiryDate: faker.date.future({ years: 0.1, refDate: availableDate }).toISOString().split("T")[0],
      tags: [...new Set(tags)].slice(0, 5),
      pickupAddress: formatAddress(donor.profile.address),
      pickupInstructions: pickupInstructions.replace(/Here are.*/i, '').trim(),
      availableDate: availableDate.toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "20:00",
      images: [imageUrl],
      status,
      donorId: donor.uid,
      donorName: donor.profile.orgName || donorDetails.name,
      donorEmail: donor.email,
      donorType: donorDetails.type,
      rating: 0,
      totalRatings: 0,
      geolocation: {
        latitude: donor.profile.address.latitude || 3.14,
        longitude: donor.profile.address.longitude || 101.69,
        formattedAddress: formatAddress(donor.profile.address)
      },
      createdAt: faker.date.past({ years: 0.1, refDate: availableDate }),
      updatedAt: new Date(),
      isTestData: true
    };

    // Add cancellation details if cancelled
    if (status === 'cancelled') {
      foodData.cancellationReason = faker.helpers.arrayElement([
        "Insufficient quantity",
        "Food quality issues",
        "Donor cancellation",
        "Logistical problems"
      ]);
      foodData.cancelledAt = faker.date.recent({ days: 1, refDate: availableDate });
      foodData.cancelledBy = donor.uid;
    }

    const docRef = db.collection("foodListings").doc();
    batch.set(docRef, foodData);
    listings.push(docRef.id);
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (i % 50 === 0) {
      logger.info(`Created ${i}/${count} food listings (${approvedCount} approved, ${pendingCount} pending, AI calls: ${aiCallCount})`);
    }
  }

  if (batchCount > 0) await batch.commit();
  
  // Final quota verification
  const finalApproved = listings.length > 0 ? (await db.collection('foodListings').where('status', '==', 'approved').get()).size : 0;
  const finalPending = listings.length > 0 ? (await db.collection('foodListings').where('status', '==', 'pending').get()).size : 0;
  const finalCompleted = listings.length > 0 ? (await db.collection('foodListings').where('status', '==', 'completed').get()).size : 0;
  const finalCancelled = listings.length > 0 ? (await db.collection('foodListings').where('status', '==', 'cancelled').get()).size : 0;
  
  logger.info(`Generated ${listings.length} listings. Final distribution: ${finalApproved} approved, ${finalPending} pending, ${finalCompleted} completed, ${finalCancelled} cancelled. AI calls made: ${aiCallCount}`);
  return listings;
}

// ========== HELPER FUNCTIONS FOR FOOD ==========
function selectFoodCategory(donorType: string): string {
  if (donorType === 'supermarket' || donorType === 'grocery') {
    const rand = Math.random();
    if (rand < 0.4) {
      return faker.helpers.arrayElement(FOOD_CATEGORIES.FRESH_PRODUCE.items);
    } else if (rand < 0.7) {
      return faker.helpers.arrayElement(FOOD_CATEGORIES.SHELF_STABLE.items);
    } else {
      return faker.helpers.arrayElement(FOOD_CATEGORIES.COOKED_MEALS.items);
    }
  } else {
    // Restaurants and hotels
    return faker.helpers.arrayElement(FOOD_CATEGORIES.COOKED_MEALS.items);
  }
}

function generateFoodTags(category: string, donorType: string, specialties: string[]): string[] {
  const tags: string[] = [];
  
  // Add category-based tags
  if (category.includes('Fresh') || category.includes('Vegetable') || category.includes('Fruit')) {
    tags.push('fresh-produce', 'healthy', 'vegetarian');
  } else if (category.includes('Cooked') || category.includes('Prepared')) {
    tags.push('ready-to-eat', 'hot-meals');
  } else if (category.includes('Shelf') || category.includes('Canned')) {
    tags.push('non-perishable', 'long-shelf-life');
  }
  
  // Add donor type tags
  if (donorType === 'hotel') {
    tags.push('hotel-quality', 'buffet');
  } else if (donorType === 'restaurant') {
    tags.push('restaurant-quality', 'freshly-prepared');
  } else if (donorType === 'supermarket' || donorType === 'grocery') {
    tags.push('grocery', 'packaged');
  }
  
  // Add halal tag (most Malaysian food)
  tags.push('halal');
  
  // Add specialty tags
  specialties.forEach(specialty => {
    const cleanTag = specialty.toLowerCase().replace(/\s+/g, '-');
    if (!tags.includes(cleanTag)) {
      tags.push(cleanTag);
    }
  });
  
  // Ensure we don't have too many tags
  return faker.helpers.arrayElements(tags, { min: 2, max: 5 });
}

// ========== 3. UPDATED CAMPAIGN GENERATION WITH FIXED STATUS ==========
export async function generateCampaignsOptimized(
  count: number,
  users: UserData[],
  pastMonths: number,
  futureDays: number
): Promise<string[]> {
  const volunteers = users.filter((u) => u.role === "volunteer" && u.status === "approved");
  if (volunteers.length === 0) {
    logger.warn("No approved volunteers found for campaigns");
    return [];
  }

  const campaignTemplates = await generateCampaignTemplates();

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - pastMonths);
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + futureDays);

  // FIXED STATUS QUOTAS: 10 approved, 10 pending, rest completed/cancelled
  let approvedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  const targetApproved = faker.number.int({ min: 4, max: 5 }); // 4-5 approved
  const targetPending = faker.number.int({ min: 4, max: 5 }); // 4-5 pending
  const targetCancelled = faker.number.int({ min: 2, max: 3 }); // 2-3 cancelled

  logger.info(`Generating ${count} campaigns with quotas: ${targetApproved} approved, ${targetPending} pending, ${targetCancelled} cancelled`);

  let batch = db.batch();
  let batchCount = 0;
  let aiCallCount = 0;
  const maxAICalls = Math.min(count, 30);
  
  const useAI = Array(count).fill(false);
  const aiTargetCount = Math.floor(count * 0.3);
  for (let i = 0; i < aiTargetCount; i++) useAI[i] = true;
  faker.helpers.shuffle(useAI);

  const campaignIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const volunteer = volunteers[i % volunteers.length];
    const realOrgName = volunteer.profile.orgName || "Community Group";
    
    // FIXED NGO MATCHING LOGIC - Use exact matching
    let ngoDetails = MALAYSIAN_NGOS.find(ngo => {
      const cleanOrgName = realOrgName.replace(/\s+\d+$/, ''); // Remove trailing numbers
      return cleanOrgName === ngo.name || cleanOrgName.includes(ngo.name) || ngo.name.includes(cleanOrgName);
    });

    if (!ngoDetails) {
      ngoDetails = { 
        name: realOrgName, 
        type: "ngo", 
        imageKey: realOrgName.split(' ')[0].toLowerCase() 
      };
    }
    
    const shouldUseAI = useAI[i] && aiCallCount < maxAICalls;
    
    let title: string;
    let description: string;
    let category: string;
    
    // ACTUALLY USE THE VARIABLES - FIXED LOGIC
    if (shouldUseAI) {
      // AI MODE
      aiCallCount++;
      if (aiCallCount > 1 && aiCallCount % 3 === 0) await new Promise(r => setTimeout(r, 1000));
      
      const campaignType = faker.helpers.arrayElement([
        { title: "Community Food Distribution Drive", category: "Mixed Items" },
        { title: "Fresh Produce Program", category: "Fresh Produce" },
        { title: "Hot Meal Service", category: "Cooked Meals" },
        { title: "Emergency Food Relief", category: "Emergency Relief" },
        { title: "Weekly Food Support Program", category: "Community Outreach" },
        { title: "Elderly Nutrition Assistance", category: "Elderly Support" },
        { title: "School Meal Initiative", category: "Education Support" },
        { title: "Festival Food Drive", category: "Festival Program" }
      ]);
      
      title = campaignType.title;
      category = campaignType.category;
      
      try {
        const rawDescription = await callGeminiWithRetry(
          async () => {
            return await geminiService.generateCampaignDescription(
              { ...ngoDetails, name: realOrgName }, 
              campaignType
            );
          },
          () => {
            const fallbackDescs = getCampaignDescriptionsFallback(category);
            return faker.helpers.arrayElement(fallbackDescs).replace("[[NAME]]", realOrgName);
          },
          1,
          500
        );
        description = cleanGeminiResponse(rawDescription, realOrgName);
      } catch (error) {
        description = `Join ${realOrgName} for our ${title} to support the local community.`;
      }
    } else if (campaignTemplates.length > 0) {
      // TEMPLATE MODE
      const template = faker.helpers.arrayElement(campaignTemplates);
      title = template.title;
      category = template.category;
      description = cleanGeminiResponse(template.description.replace("[[NAME]]", realOrgName), realOrgName);
    } else {
      // FALLBACK
      title = "Community Food Drive";
      category = "Mixed Items";
      description = `${realOrgName} is organizing a food drive to support local families in need.`;
    }

    // FIXED: Only approved campaigns can have registrations
    let status: string;
    let campaignDate: Date;
    let registeredSpots = 0;
    let totalSpots = faker.number.int({ min: 20, max: 50 });
    
    if (approvedCount < targetApproved) {
      status = 'approved';
      campaignDate = faker.date.between({ from: now, to: futureDate });
      approvedCount++;
      // Approved campaigns can have some registrations (20-50% of total)
      registeredSpots = faker.number.int({ 
        min: Math.floor(totalSpots * 0.2), 
        max: Math.floor(totalSpots * 0.5) 
      });
    } else if (pendingCount < targetPending) {
      status = 'pending';
      campaignDate = faker.date.between({ from: now, to: futureDate });
      pendingCount++;
      // PENDING CAMPAIGNS MUST HAVE 0 REGISTRATIONS
      registeredSpots = 0;
    } else if (cancelledCount < targetCancelled) {
      status = 'cancelled';
      campaignDate = faker.date.between({ from: pastDate, to: now });
      cancelledCount++;
      registeredSpots = 0;
    } else {
      // Completed campaigns
      status = 'completed';
      campaignDate = faker.date.between({ from: pastDate, to: now });
      // Use 60-95% of total, so there are always SOME available spots that weren't taken
      registeredSpots = faker.number.int({ 
        min: Math.floor(totalSpots * 0.6), 
        max: Math.floor(totalSpots * 0.95) 
      });
    }

    // CRITICAL FIX: Ensure registeredSpots is ALWAYS less than totalSpots
    // Add this safety clamp
    if (registeredSpots >= totalSpots) {
      registeredSpots = Math.max(1, totalSpots - 1); // Leave at least 1 spot available
      if (registeredSpots === 0 && totalSpots > 0) {
        // If by some logic we'd have 0 registered, make sure we have at least 1 for realism
        registeredSpots = Math.min(1, totalSpots - 1);
      }
    }

    // Also ensure totalSpots is at least 1 more than registered
    if (totalSpots <= registeredSpots) {
      totalSpots = registeredSpots + 1;
    }

    // Ensure pending campaigns have 0 registrations (double-check)
    if (status === 'pending') {
      registeredSpots = 0;
    }

    const availableSpots = Math.max(0, totalSpots - registeredSpots);
    
    // FINAL SAFETY CHECK: registeredSpots CANNOT equal or exceed totalSpots
    if (registeredSpots >= totalSpots) {
      registeredSpots = Math.max(1, totalSpots - 1); // Always leave at least 1 spot available
    }

    // Location setup
    const campaignLocation: CampaignLocation | null = getRandomCampaignLocation(ngoDetails.name);
    
    let locationName: string;
    let fullAddress: string;
    let geolocationLat: number;
    let geolocationLng: number;

    if (campaignLocation) {
      locationName = campaignLocation.placeName;
      const addr = campaignLocation.address;
      fullAddress = formatAddress(addr);
      geolocationLat = addr.latitude || 3.14;
      geolocationLng = addr.longitude || 101.69;
    } else {
      locationName = `${volunteer.profile.address?.city || "Community"} Center`;
      const addr = volunteer.profile.address || {
        street: faker.location.streetAddress(),
        city: "Kuala Lumpur",
        postalCode: faker.location.zipCode(),
        state: "Selangor",
        latitude: 3.14,
        longitude: 101.69
      };
      fullAddress = formatAddress(addr);
      geolocationLat = addr.latitude || 3.14;
      geolocationLng = addr.longitude || 101.69;
    }

    // Ensure pending campaigns have 0 registrations
    if (status === 'pending') {
      registeredSpots = 0;
    }

    const ngoImages = getNgoImages(ngoDetails.name);
    const selectedImage = faker.helpers.arrayElement(ngoImages);
    const imageUrl = getNgoImageUrl(ngoDetails.name, selectedImage);

    let createdAt = faker.date.past({ refDate: campaignDate, years: 0.1 });
    if (createdAt > campaignDate) createdAt = new Date(campaignDate.getTime() - 86400000);

    const campaignData: CampaignData = {
      title: title.replace(/Here are.*/i, '').trim(),
      description: description.replace(/Here are.*/i, '').trim(),
      category,
      campaignDate: campaignDate.toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "14:00",
      locationName,
      fullAddress,
      totalSpots,
      registeredSpots,
      availableSpots: Math.max(0, availableSpots),
      images: [imageUrl],
      status,
      organizerId: volunteer.uid,
      organizerName: volunteer.profile.orgName || 'NGO',
      organizerEmail: volunteer.email,
      organizerOrg: volunteer.profile.orgName || 'NGO',
      rating: 0,
      totalRatings: 0,
      geolocation: {
        latitude: geolocationLat,
        longitude: geolocationLng,
        formattedAddress: fullAddress,
      },
      createdAt,
      updatedAt: new Date(),
      isTestData: true,
    };

    const docRef = db.collection("campaigns").doc();
    batch.set(docRef, campaignData);
    campaignIds.push(docRef.id);
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (batchCount > 0) await batch.commit();
  
  // Final quota verification
  const finalApproved = campaignIds.length > 0 ? (await db.collection('campaigns').where('status', '==', 'approved').get()).size : 0;
  const finalPending = campaignIds.length > 0 ? (await db.collection('campaigns').where('status', '==', 'pending').get()).size : 0;
  const finalCompleted = campaignIds.length > 0 ? (await db.collection('campaigns').where('status', '==', 'completed').get()).size : 0;
  const finalCancelled = campaignIds.length > 0 ? (await db.collection('campaigns').where('status', '==', 'cancelled').get()).size : 0;
  
  logger.info(`Generated ${campaignIds.length} campaigns. Final distribution: ${finalApproved} approved, ${finalPending} pending, ${finalCompleted} completed, ${finalCancelled} cancelled. AI calls made: ${aiCallCount}`);
  return campaignIds;
}

// ========== ENHANCED RESERVATIONS AND RATINGS GENERATION ==========
export async function generateReservationsAndRatings(
  users: UserData[], 
  foodListingIds?: string[],
  campaignIds?: string[]
) {
  const receivers = users.filter(u => u.role === 'receiver' && u.status === 'approved');
  const volunteers = users.filter(u => u.role === 'volunteer' && u.status === 'approved');
  
  if (receivers.length === 0 && volunteers.length === 0) {
    logger.info("No approved receivers or volunteers found for relationships");
    return { reservations: [], registrations: [], ratings: [] };
  }

  logger.info("Starting ENHANCED relationship generation with IDEMPOTENT logic...");

  // 1. Fetch ALL test food listings and campaigns
  let allListings: { id: string, data: FoodListingData }[] = [];
  let allCampaigns: { id: string, data: CampaignData }[] = [];

  // If specific IDs provided, use them; otherwise fetch all test data
  if (foodListingIds && foodListingIds.length > 0) {
    const listingRefs = foodListingIds.map(id => db.collection('foodListings').doc(id));
    const listingSnaps = await db.getAll(...listingRefs);
    allListings = listingSnaps
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, data: doc.data() as FoodListingData }));
  } else {
    const listingSnap = await db.collection('foodListings')
      .where('isTestData', '==', true)
      .get();
    allListings = listingSnap.docs.map(doc => ({ 
      id: doc.id, 
      data: doc.data() as FoodListingData 
    }));
  }

  if (campaignIds && campaignIds.length > 0) {
    const campaignRefs = campaignIds.map(id => db.collection('campaigns').doc(id));
    const campaignSnaps = await db.getAll(...campaignRefs);
    allCampaigns = campaignSnaps
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, data: doc.data() as CampaignData }));
  } else {
    const campaignSnap = await db.collection('campaigns')
      .where('isTestData', '==', true)
      .get();
    allCampaigns = campaignSnap.docs.map(doc => ({ 
      id: doc.id, 
      data: doc.data() as CampaignData 
    }));
  }
  
  logger.info(`Found ${allListings.length} food listings and ${allCampaigns.length} campaigns to process`);

  // 2. PRE-FETCH ALL EXISTING RELATIONSHIPS (CRITICAL FOR IDEMPOTENCY)
  // This prevents "doubling" when script runs multiple times
  logger.info("Checking for existing relationships to prevent duplication...");
  
  const existingReservations = new Map<string, { completed: number, confirmed: number, totalQuantity: number }>();
  const existingRegistrations = new Map<string, number>();
  const existingRatings = new Map<string, Set<string>>(); // targetId -> Set<ratingIds>
  
  // Fetch existing food reservations
  try {
    const reservationSnap = await db.collection('foodReservations')
      .where('isTestData', '==', true)
      .get();
    
    reservationSnap.forEach(doc => {
      const data = doc.data();
      const listingId = data.foodListingId;
      const status = data.status;
      const quantity = data.quantity || 0;
      
      if (!existingReservations.has(listingId)) {
        existingReservations.set(listingId, { completed: 0, confirmed: 0, totalQuantity: 0 });
      }
      
      const entry = existingReservations.get(listingId)!;
      if (status === 'completed') {
        entry.completed += quantity;
      } else if (status === 'confirmed') {
        entry.confirmed += quantity;
      }
      entry.totalQuantity += quantity;
    });
    
    logger.info(`Found ${existingReservations.size} listings with existing reservations`);
  } catch (error) {
    logger.error("Error fetching existing reservations:", error);
  }
  
  // Fetch existing campaign registrations
  try {
    const registrationSnap = await db.collection('campaignRegistrations')
      .where('isTestData', '==', true)
      .get();
    
    registrationSnap.forEach(doc => {
      const campaignId = doc.data().campaignId;
      existingRegistrations.set(campaignId, (existingRegistrations.get(campaignId) || 0) + 1);
    });
    
    logger.info(`Found ${existingRegistrations.size} campaigns with existing registrations`);
  } catch (error) {
    logger.error("Error fetching existing registrations:", error);
  }
  
  // Fetch existing ratings
  try {
    const ratingsSnap = await db.collection('ratings')
      .where('isTestData', '==', true)
      .get();
    
    ratingsSnap.forEach(doc => {
      const data = doc.data();
      const targetId = data.targetId;
      if (!existingRatings.has(targetId)) {
        existingRatings.set(targetId, new Set());
      }
      existingRatings.get(targetId)!.add(doc.id);
    });
    
    logger.info(`Found ${existingRatings.size} items with existing ratings`);
  } catch (error) {
    logger.error("Error fetching existing ratings:", error);
  }

  const newReservations: string[] = [];
  const newRegistrations: string[] = [];
  const newRatings: string[] = [];

  // 3. PROCESS FOOD LISTINGS WITH STRICT QUANTITY MATCHING
  for (const { id: listingId, data: listing } of allListings) {
    // Skip listings with no reserved quantity
    if (!listing.reservedQuantity || listing.reservedQuantity <= 0) continue;
    
    await generateStrictFoodReservations(
      listingId, 
      listing, 
      receivers, 
      volunteers, 
      existingReservations, 
      existingRatings,
      newReservations, 
      newRatings
    );
  }

  // 4. PROCESS CAMPAIGNS WITH STRICT SPOT MATCHING
  for (const { id: campaignId, data: campaign } of allCampaigns) {
    // Skip campaigns with no registered spots or cancelled/pending statuses
    if (!campaign.registeredSpots || campaign.registeredSpots <= 0) continue;
    if (campaign.status === 'cancelled' || campaign.status === 'pending') continue;
    
    await generateStrictCampaignRegistrations(
      campaignId, 
      campaign, 
      receivers, 
      existingRegistrations,
      existingRatings,
      newRegistrations, 
      newRatings
    );
  }

  // 5. UPDATE AGGREGATED RATINGS FOR NEW ENTRIES ONLY
  if (newRatings.length > 0) {
    await updateAggregatedRatings(newRatings);
  }

  logger.info(`ENHANCED generation complete: 
    ${newReservations.length} new reservations, 
    ${newRegistrations.length} new registrations, 
    ${newRatings.length} new ratings`);
  
  return { reservations: newReservations, registrations: newRegistrations, ratings: newRatings };
}

// ✅ FIXED: Strict quantity matching for food reservations
async function generateStrictFoodReservations(
  listingId: string,
  listing: FoodListingData,
  receivers: UserData[],
  volunteers: UserData[],
  existingReservations: Map<string, { completed: number, confirmed: number, totalQuantity: number }>,
  existingRatings: Map<string, Set<string>>,
  reservationsList: string[],
  ratingsList: string[]
) {
  const targetCollected = listing.collectedQuantity || 0;
  const targetTotalReserved = listing.reservedQuantity || 0;
  
  // Calculate how many are already reserved
  const existing = existingReservations.get(listingId) || { completed: 0, confirmed: 0, totalQuantity: 0 };
  const existingCompletedQty = existing.completed;
  const existingTotalQty = existing.totalQuantity;
  
  // Calculate what we still need to generate
  const neededCollectedQty = Math.max(0, targetCollected - existingCompletedQty);
  const totalNeeded = Math.max(0, targetTotalReserved - existingTotalQty);
  
  // We need to handle this carefully:
  // 1. First fill any needed completed reservations
  // 2. Then use remaining needed spots for confirmed reservations
  let neededConfirmedQty = totalNeeded;
  
  // If we need more completed than total needed, adjust
  if (neededCollectedQty > totalNeeded) {
    neededConfirmedQty = 0;
  } else {
    neededConfirmedQty = totalNeeded - neededCollectedQty;
  }
  
  // If nothing needed, skip
  if (neededCollectedQty <= 0 && neededConfirmedQty <= 0) {
    logger.debug(`Skipping listing ${listingId} - all reservations already exist`);
    return;
  }
  
  logger.debug(`Generating reservations for listing ${listingId}: 
    Need ${neededCollectedQty} completed (have ${existingCompletedQty}/${targetCollected}), 
    ${neededConfirmedQty} confirmed (total reserved: ${targetTotalReserved}, existing total: ${existingTotalQty})`);

  const allUsers = [...receivers, ...volunteers];
  if (allUsers.length === 0) {
    logger.warn(`No users available for reservations on listing ${listingId}`);
    return;
  }
  
  let generatedCollected = 0;
  let generatedConfirmed = 0;
  
  // 1. Generate COMPLETED reservations (picked up)
  while (generatedCollected < neededCollectedQty) {
    const remaining = neededCollectedQty - generatedCollected;
    const user = faker.helpers.arrayElement(allUsers);
    
    // Determine quantity based on user role
    const maxTake = user.role === 'volunteer' ? 20 : 5;
    const qty = faker.number.int({ 
      min: 1, 
      max: Math.min(remaining, maxTake) 
    });
    
    if (qty <= 0) break;
    
    const resData = {
      foodListingId: listingId,
      userId: user.uid,
      userType: user.role,
      quantity: qty,
      status: 'completed' as const,
      reservedAt: faker.date.recent({ days: 5 }),
      pickedUpAt: faker.date.recent({ days: 2 }),
      updatedAt: new Date(),
      userName: user.profile.name || user.profile.orgName || faker.person.fullName(),
      userEmail: user.email,
      userPhone: user.profile.phone,
      donorId: listing.donorId,
      donorName: listing.donorName,
      isTestData: true,
      isVolunteerReservation: user.role === 'volunteer'
    };
    
    const ref = await db.collection('foodReservations').add(resData);
    reservationsList.push(ref.id);
    generatedCollected += qty;
    
    // Generate rating for completed reservation (50% chance)
    // Check if rating already exists for this user+listing combination
    const ratingExists = await checkRatingExists(listingId, user.uid, 'food');
    if (!ratingExists && Math.random() > 0.5) {
      await createRandomRating({ ...listing, id: listingId }, user, ref.id, ratingsList);
    }
  }
  
  // 2. Generate CONFIRMED reservations (not picked up yet)
  while (generatedConfirmed < neededConfirmedQty) {
    const remaining = neededConfirmedQty - generatedConfirmed;
    const user = faker.helpers.arrayElement(allUsers);
    
    const maxTake = user.role === 'volunteer' ? 20 : 5;
    const qty = faker.number.int({ 
      min: 1, 
      max: Math.min(remaining, maxTake) 
    });
    
    if (qty <= 0) break;
    
    const resData = {
      foodListingId: listingId,
      userId: user.uid,
      userType: user.role,
      quantity: qty,
      status: 'confirmed' as const,
      reservedAt: faker.date.recent({ days: 1 }),
      pickedUpAt: null,
      updatedAt: new Date(),
      userName: user.profile.name || user.profile.orgName || faker.person.fullName(),
      userEmail: user.email,
      userPhone: user.profile.phone,
      donorId: listing.donorId,
      donorName: listing.donorName,
      isTestData: true,
      isVolunteerReservation: user.role === 'volunteer'
    };
    
    const ref = await db.collection('foodReservations').add(resData);
    reservationsList.push(ref.id);
    generatedConfirmed += qty;
  }
  
  // Verify totals match
  const totalGenerated = generatedCollected + generatedConfirmed;
  
  if (totalGenerated !== totalNeeded) {
    logger.warn(`Quantity mismatch for listing ${listingId}: 
      Generated ${totalGenerated} (${generatedCollected} completed, ${generatedConfirmed} confirmed), 
      Needed ${totalNeeded} (${neededCollectedQty} completed, ${neededConfirmedQty} confirmed)`);
  }
}

// ✅ FIXED: Strict quantity matching for campaign registrations
async function generateStrictCampaignRegistrations(
  campaignId: string,
  campaign: CampaignData,
  receivers: UserData[],
  existingRegistrations: Map<string, number>,
  existingRatings: Map<string, Set<string>>,
  registrationsList: string[],
  ratingsList: string[]
) {
  const targetSpots = campaign.registeredSpots || 0;
  const existingCount = existingRegistrations.get(campaignId) || 0;
  const neededSpots = Math.max(0, targetSpots - existingCount);
  
  if (neededSpots <= 0) {
    logger.debug(`Skipping campaign ${campaignId} - all ${targetSpots} spots already registered`);
    return;
  }
  
  if (receivers.length === 0) {
    logger.warn(`No receivers available for campaign ${campaignId}`);
    return;
  }
  
  logger.debug(`Generating registrations for campaign ${campaignId}: Need ${neededSpots} (have ${existingCount}/${targetSpots})`);
  
  for (let i = 0; i < neededSpots; i++) {
    // Cycle through receivers to distribute registrations
    const user = receivers[i % receivers.length];
    
    // Determine status based on campaign status
    let status: 'registered' | 'attended' = 'registered';
    let attendedAt = null;
    
    if (campaign.status === 'completed') {
      // For completed campaigns, 80% attended, 20% registered but didn't attend
      status = Math.random() > 0.2 ? 'attended' : 'registered';
      attendedAt = status === 'attended' ? new Date(campaign.campaignDate) : null;
    } else if (campaign.status === 'approved') {
      // For approved upcoming campaigns, everyone is just registered
      status = 'registered';
    }
    
    const regData = {
      campaignId,
      userId: user.uid,
      status,
      registeredAt: faker.date.recent({ days: 10 }),
      attendedAt,
      updatedAt: new Date(),
      userName: user.profile.name || faker.person.fullName(),
      userEmail: user.email,
      userPhone: user.profile.phone,
      organizerId: campaign.organizerId,
      organizerName: campaign.organizerName,
      isTestData: true
    };
    
    const ref = await db.collection('campaignRegistrations').add(regData);
    registrationsList.push(ref.id);
    
    // Generate rating if attended (40% chance)
    // Check if rating already exists for this user+campaign combination
    const ratingExists = await checkRatingExists(campaignId, user.uid, 'campaign');
    if (status === 'attended' && !ratingExists && Math.random() > 0.6) {
      await createCampaignRating({ ...campaign, id: campaignId }, user, ref.id, ratingsList);
    }
  }
}

// ✅ FIXED: Enhanced rating creation with proper links
async function createRandomRating(target: any, rater: UserData, reservationId: string, ratingsList: string[]) {
  const isPositive = Math.random() > 0.2;
  const ratingVal = isPositive ? faker.number.int({ min: 4, max: 5 }) : faker.number.int({ min: 2, max: 3 });
  
  const comment = await callGeminiWithRetry(
    async () => {
      return await geminiService.generateRatingComment(
        'food', 
        target.title, 
        isPositive, 
        ratingVal, 
        target
      );
    },
    () => {
      const commentPool = isPositive 
        ? FALLBACK_CONTENT.ratingComments.positive 
        : FALLBACK_CONTENT.ratingComments.constructive;
      return faker.helpers.arrayElement(commentPool);
    },
    1,
    500
  );

  // FIX: Make sure target.id exists
  const targetId = target.id || target.targetId || 'unknown';
  
  const data = {
    targetType: 'food',
    targetId: targetId, // Use the properly extracted ID
    targetName: target.title,
    
    // CRITICAL: Link to donor user for rating aggregation
    ratedUserId: target.donorId,
    ratedUserName: target.donorName,
    ratedUserType: 'donor',
    
    // CRITICAL: Link to rater
    raterUserId: rater.uid,
    raterUserName: rater.profile.name || rater.profile.orgName || faker.person.fullName(),
    raterUserType: rater.role,
    
    rating: ratingVal,
    comment: comment.replace(/Here are.*/i, '').trim(),
    reservationId: reservationId,
    createdAt: faker.date.recent(30),
    updatedAt: new Date(),
    isTestData: true
  };
  
  // Only add rating if we have a valid targetId
  if (targetId !== 'unknown') {
    const ref = await db.collection('ratings').add(data);
    ratingsList.push(ref.id);
  } else {
    logger.warn(`Skipping rating creation for food - no valid targetId found`);
  }
}

// ✅ NEW: Check if a rating already exists for this user+target combination
async function checkRatingExists(targetId: string, userId: string, targetType: string): Promise<boolean> {
  try {
    const ratingSnap = await db.collection('ratings')
      .where('targetId', '==', targetId)
      .where('raterUserId', '==', userId)
      .where('targetType', '==', targetType)
      .where('isTestData', '==', true)
      .limit(1)
      .get();
    
    return !ratingSnap.empty;
  } catch (error) {
    logger.warn(`Error checking existing rating: ${error}`);
    return false;
  }
}

async function createCampaignRating(campaign: any, user: UserData, registrationId: string, ratingsList: string[]) {
  const isPositive = Math.random() > 0.3;
  const ratingVal = isPositive ? faker.number.int({ min: 4, max: 5 }) : faker.number.int({ min: 2, max: 3 });
  
  const comment = await callGeminiWithRetry(
    async () => {
      return await geminiService.generateRatingComment(
        'campaign', 
        campaign.title, 
        isPositive, 
        ratingVal, 
        campaign
      );
    },
    () => {
      const commentPool = isPositive 
        ? FALLBACK_CONTENT.ratingComments.positive 
        : FALLBACK_CONTENT.ratingComments.constructive;
      return faker.helpers.arrayElement(commentPool);
    },
    1,
    500
  );

  // FIX: Make sure campaign.id exists
  const targetId = campaign.id || campaign.targetId || 'unknown';
  
  if (targetId === 'unknown') {
    logger.warn(`Skipping rating creation for campaign - no valid targetId found`);
    return;
  }
  
  const ratingData = {
    targetType: 'campaign',
    targetId: targetId,
    targetName: campaign.title,
    
    // CRITICAL: Link to volunteer/organizer
    ratedUserId: campaign.organizerId,
    ratedUserName: campaign.organizerName,
    ratedUserType: 'volunteer',
    
    // CRITICAL: Link to rater
    raterUserId: user.uid,
    raterUserName: user.profile.name || faker.person.fullName(),
    raterUserType: 'receiver',
    
    rating: ratingVal,
    comment: comment.replace(/Here are.*/i, '').trim(),
    registrationId: registrationId,
    createdAt: faker.date.recent(30),
    updatedAt: new Date(),
    isTestData: true
  };

  const ratingRef = await db.collection('ratings').add(ratingData);
  ratingsList.push(ratingRef.id);
}

// ✅ NEW: Comprehensive rating aggregation for items AND users
async function updateAggregatedRatings(ratingIds: string[]) {
  if (ratingIds.length === 0) return;
  
  logger.info(`Updating aggregated ratings for ${ratingIds.length} ratings...`);
  
  // Fetch all new ratings
  const ratingPromises = ratingIds.map(async (ratingId) => {
    const ratingDoc = await db.collection('ratings').doc(ratingId).get();
    if (!ratingDoc.exists) return null;
    const data = ratingDoc.data();
    return { 
      id: ratingId, 
      targetType: data?.targetType || '',
      targetId: data?.targetId || '',
      rating: data?.rating || 0,
      ratedUserId: data?.ratedUserId || '',
      ratedUserName: data?.ratedUserName || '',
      ratedUserType: data?.ratedUserType || '',
      raterUserId: data?.raterUserId || '',
      raterUserName: data?.raterUserName || '',
      raterUserType: data?.raterUserType || ''
    };
  });
  
  const ratings = (await Promise.all(ratingPromises)).filter(r => r !== null) as {
    id: string;
    targetType: string;
    targetId: string;
    rating: number;
    ratedUserId: string;
    ratedUserName: string;
    ratedUserType: string;
    raterUserId: string;
    raterUserName: string;
    raterUserType: string;
  }[];
  
  // Group by target types and users
  const foodRatings: Record<string, { sum: number; count: number }> = {};
  const campaignRatings: Record<string, { sum: number; count: number }> = {};
  const userRatings: Record<string, { sum: number; count: number }> = {};
  
  // Calculate aggregates
  for (const rating of ratings) {
    // 1. Aggregate by food listing
    if (rating.targetType === 'food' && rating.targetId) {
      if (!foodRatings[rating.targetId]) {
        foodRatings[rating.targetId] = { sum: 0, count: 0 };
      }
      foodRatings[rating.targetId].sum += rating.rating;
      foodRatings[rating.targetId].count += 1;
    }
    
    // 2. Aggregate by campaign
    else if (rating.targetType === 'campaign' && rating.targetId) {
      if (!campaignRatings[rating.targetId]) {
        campaignRatings[rating.targetId] = { sum: 0, count: 0 };
      }
      campaignRatings[rating.targetId].sum += rating.rating;
      campaignRatings[rating.targetId].count += 1;
    }
    
    // 3. Aggregate by user (donor/volunteer)
    if (rating.ratedUserId) {
      if (!userRatings[rating.ratedUserId]) {
        userRatings[rating.ratedUserId] = { sum: 0, count: 0 };
      }
      userRatings[rating.ratedUserId].sum += rating.rating;
      userRatings[rating.ratedUserId].count += 1;
    }
  }
  
  const batch = db.batch();
  let operationCount = 0;
  const MAX_BATCH_SIZE = 400;
  
  // Helper to commit batch when needed
  const commitIfNeeded = async () => {
    if (operationCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      operationCount = 0;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  // 1. Update food listings with aggregated ratings
  for (const [listingId, ratingData] of Object.entries(foodRatings)) {
    const avgRating = ratingData.sum / ratingData.count;
    
    batch.update(db.collection('foodListings').doc(listingId), {
      rating: parseFloat(avgRating.toFixed(1)),
      totalRatings: ratingData.count
    });
    
    operationCount++;
    await commitIfNeeded();
  }
  
  // 2. Update campaigns with aggregated ratings
  for (const [campaignId, ratingData] of Object.entries(campaignRatings)) {
    const avgRating = ratingData.sum / ratingData.count;
    
    batch.update(db.collection('campaigns').doc(campaignId), {
      rating: parseFloat(avgRating.toFixed(1)),
      totalRatings: ratingData.count
    });
    
    operationCount++;
    await commitIfNeeded();
  }
  
  // 3. Update users with aggregated ratings
  for (const [userId, ratingData] of Object.entries(userRatings)) {
    const avgRating = ratingData.sum / ratingData.count;
    
    // Update user document with rating info
    try {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        rating: parseFloat(avgRating.toFixed(1)),
        totalRatings: ratingData.count,
        'profile.rating': parseFloat(avgRating.toFixed(1)),
        'profile.totalRatings': ratingData.count
      });
      
      operationCount++;
      await commitIfNeeded();
    } catch (error) {
      logger.warn(`Could not update ratings for user ${userId}:`, error);
    }
  }
  
  // Commit any remaining operations
  if (operationCount > 0) {
    await batch.commit();
  }
  
  logger.info(`Updated aggregated ratings: ${Object.keys(foodRatings).length} food listings, ${Object.keys(campaignRatings).length} campaigns, ${Object.keys(userRatings).length} users`);
}

// ========== REPORT GENERATION ==========
export async function generateReports(
  users: UserData[], 
  foodListingIds: string[], 
  campaignIds: string[]
): Promise<string[]> {
  const reports: string[] = [];
  const approvedUsers = users.filter(u => u.status === 'approved');

  const donors = users.filter(u => u.role === 'donor' && u.status === 'approved');
  const volunteers = users.filter(u => u.role === 'volunteer' && u.status === 'approved');
  const receivers = users.filter(u => u.role === 'receiver' && u.status === 'approved');
  
  const problematicDonors = faker.helpers.arrayElements(donors, Math.min(3, donors.length));
  const problematicVolunteers = faker.helpers.arrayElements(volunteers, Math.min(2, volunteers.length));
  const problematicReceivers = faker.helpers.arrayElements(receivers, Math.min(2, receivers.length));
  
  const donorReports = 4;
  const volunteerReports = 3;
  const receiverReports = 3; 

  // Donor reports
  for (let i = 0; i < donorReports; i++) {
    if (problematicDonors.length === 0) break;
    
    const reportedUser = problematicDonors[i % problematicDonors.length];
    const possibleReporters = approvedUsers.filter(u => u.uid !== reportedUser.uid);
    const reporter = faker.helpers.arrayElement(possibleReporters);
    
    let targetType: 'food' | 'campaign' | 'user';
    let targetId: string | undefined;
    let targetName: string;
    
    // Find donor's listings
    const donorListings: string[] = [];
    for (const listingId of foodListingIds) {
      const listing = await db.collection('foodListings').doc(listingId).get();
      if (listing.data()?.donorId === reportedUser.uid) {
        donorListings.push(listingId);
      }
    }
    
    if (donorListings.length > 0) {
      targetType = 'food';
      targetId = faker.helpers.arrayElement(donorListings);
      const listingDoc = await db.collection('foodListings').doc(targetId).get();
      targetName = listingDoc.data()?.title || 'Food Listing';
    } else {
      targetType = 'user';
      targetName = reportedUser.profile.orgName || 'Donor';
    }

    const reportStatus = faker.helpers.arrayElement(['pending', 'under_review', 'resolved', 'dismissed']);
    const reason = faker.helpers.arrayElement(['Poor quality', 'Late delivery', 'Missing items', 'Unhygienic packaging']);
    const severity = faker.helpers.arrayElement(['medium', 'high']);

    const description = `The donor ${reportedUser.profile.orgName} had issues with ${reason.toLowerCase()}. ${reporter.profile.name || 'A user'} reported this incident.`;

    const evidenceImages = ["evidence_1", "evidence_2", "evidence_3"];
    const selectedEvidence = faker.helpers.arrayElement(evidenceImages);
    const evidenceUrl = getEvidenceImageUrl(selectedEvidence);
    
    const reportData = {
      reportType: targetType,
      targetId: targetType !== 'user' ? targetId : undefined,
      targetName,
      reportedUser: {
        id: reportedUser.uid,
        name: reportedUser.profile.orgName || 'Donor',
        email: reportedUser.email,
        type: reportedUser.role
      },
      reporterUser: {
        id: reporter.uid,
        name: reporter.profile.name || reporter.profile.orgName || 'User',
        email: reporter.email
      },
      reason: reason,
      description: description.trim(),
      severity: severity,
      evidenceUrls: [evidenceUrl],
      status: reportStatus,
      adminNotes: reportStatus !== 'pending' ? 'Investigation completed.' : null,
      resolvedAt: reportStatus === 'resolved' ? faker.date.recent() : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const reportRef = await db.collection('reports').add(reportData);
    reports.push(reportRef.id);
  }

  // Volunteer reports
  for (let i = 0; i < volunteerReports; i++) {
    if (problematicVolunteers.length === 0) break;
    
    const reportedUser = problematicVolunteers[i % problematicVolunteers.length];
    const possibleReporters = approvedUsers.filter(u => u.uid !== reportedUser.uid);
    const reporter = faker.helpers.arrayElement(possibleReporters);
    
    let targetType: 'food' | 'campaign' | 'user';
    let targetId: string | undefined;
    let targetName: string;
    
    // Find volunteer's campaigns
    const volunteerCampaigns: string[] = [];
    for (const campaignId of campaignIds) {
      const campaign = await db.collection('campaigns').doc(campaignId).get();
      if (campaign.data()?.organizerId === reportedUser.uid) {
        volunteerCampaigns.push(campaignId);
      }
    }
    
    if (volunteerCampaigns.length > 0) {
      targetType = 'campaign';
      targetId = faker.helpers.arrayElement(volunteerCampaigns);
      const campaignDoc = await db.collection('campaigns').doc(targetId).get();
      targetName = campaignDoc.data()?.title || 'Campaign';
    } else {
      targetType = 'user';
      targetName = reportedUser.profile.orgName || 'Volunteer';
    }

    const reportStatus = faker.helpers.arrayElement(['pending', 'under_review', 'resolved', 'dismissed']);
    const reason = faker.helpers.arrayElement(['Poor organization', 'No show', 'Unprofessional behavior', 'Late start']);
    const severity = faker.helpers.arrayElement(['medium', 'high']);

    const description = `The volunteer ${reportedUser.profile.orgName} showed ${reason.toLowerCase()} during their campaign. Reported by ${reporter.profile.name || 'a participant'}.`;

    const evidenceImages = ["evidence_1", "evidence_2", "evidence_3"];
    const selectedEvidence = faker.helpers.arrayElement(evidenceImages);
    const evidenceUrl = getEvidenceImageUrl(selectedEvidence);
    
    const reportData = {
      reportType: targetType,
      targetId: targetType !== 'user' ? targetId : undefined,
      targetName,
      reportedUser: {
        id: reportedUser.uid,
        name: reportedUser.profile.orgName || 'Volunteer',
        email: reportedUser.email,
        type: reportedUser.role
      },
      reporterUser: {
        id: reporter.uid,
        name: reporter.profile.name || reporter.profile.orgName || 'User',
        email: reporter.email
      },
      reason: reason,
      description: description.trim(),
      severity: severity,
      evidenceUrls: [evidenceUrl],
      status: reportStatus,
      adminNotes: reportStatus !== 'pending' ? 'Organizational issues confirmed.' : null,
      resolvedAt: reportStatus === 'resolved' ? faker.date.recent() : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const reportRef = await db.collection('reports').add(reportData);
    reports.push(reportRef.id);
  }

  // Receiver reports
  for (let i = 0; i < receiverReports; i++) {
    if (problematicReceivers.length === 0) break;
    
    const reportedUser = problematicReceivers[i % problematicReceivers.length];
    
    // Find potential reporters (donors or volunteers who might interact with receivers)
    const potentialReporters: UserData[] = [...donors, ...volunteers];
    
    if (potentialReporters.length === 0) continue;
    
    const reporter = faker.helpers.arrayElement(potentialReporters);
    const targetType = 'user' as const;
    const targetName = reportedUser.profile.name || 'Receiver';
    
    const reason = faker.helpers.arrayElement([
      'Rude behavior', 
      'No show for pickup', 
      'Aggressive demanding', 
      'Multiple cancellations'
    ]);
    
    const reportStatus = faker.helpers.arrayElement(['pending', 'under_review', 'resolved', 'dismissed']);
    const severity = faker.helpers.arrayElement(['medium', 'high']);

    const description = `The receiver ${targetName} displayed problematic behavior: ${reason.toLowerCase()}. Reported by ${reporter.profile.name || 'staff'}.`;

    const evidenceImages = ["evidence_1", "evidence_2", "evidence_3"];
    const selectedEvidence = faker.helpers.arrayElement(evidenceImages);
    const evidenceUrl = getEvidenceImageUrl(selectedEvidence);
    
    const reportData = {
      reportType: targetType,
      targetId: undefined,
      targetName,
      reportedUser: {
        id: reportedUser.uid,
        name: reportedUser.profile.name || 'Receiver',
        email: reportedUser.email,
        type: reportedUser.role
      },
      reporterUser: {
        id: reporter.uid,
        name: reporter.profile.orgName || reporter.profile.name || 'User',
        email: reporter.email
      },
      reason: reason,
      description: description.trim(),
      severity: severity,
      evidenceUrls: [evidenceUrl],
      status: reportStatus,
      adminNotes: reportStatus !== 'pending' ? 'Behavioral issues noted.' : null,
      resolvedAt: reportStatus === 'resolved' ? faker.date.recent() : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const reportRef = await db.collection('reports').add(reportData);
    reports.push(reportRef.id);
  }

  logger.info(`Generated ${reports.length} total reports`);
  return reports;
}

// ========== CLEANUP FUNCTIONS ==========
export async function cleanTestDataFromFirestore(): Promise<number> {
  let totalDeleted = 0;
  
  const collections = [
    "foodReservations",
    "campaignRegistrations", 
    "ratings",
    "reports",
    "foodListings",
    "campaigns",
    "rejectedUsers",
    "users"
  ];

  for (const collection of collections) {
    try {
      logger.info(`Cleaning collection: ${collection}`);
      
      let batchCount = 0;
      let collectionDeleted = 0;
      let hasMoreDocuments = true;
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
      
      while (hasMoreDocuments) {
        let query = db.collection(collection).where("isTestData", "==", true).limit(100);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          logger.info(`No more test documents in ${collection}`);
          hasMoreDocuments = false;
          continue;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        try {
          await batch.commit();
          const deletedInBatch = snapshot.docs.length;
          collectionDeleted += deletedInBatch;
          totalDeleted += deletedInBatch;
          batchCount++;
          
          logger.info(`Batch ${batchCount}: Deleted ${deletedInBatch} documents from ${collection}`);
          
          lastDoc = snapshot.docs[snapshot.docs.length - 1];
          
          if (snapshot.docs.length < 100) {
            hasMoreDocuments = false;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (batchError) {
          logger.error(`Error in batch ${batchCount} for ${collection}:`, batchError);
          lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
      }
      
      logger.info(`Total deleted from ${collection}: ${collectionDeleted}`);
      
    } catch (error) {
      logger.error(`Error cleaning collection ${collection}:`, error);
    }
  }

  logger.info(`Total documents deleted from Firestore: ${totalDeleted}`);
  return totalDeleted;
}

export async function cleanTestDataFromAuth(): Promise<void> {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const testUsers = listUsersResult.users.filter(user => 
      user.email?.includes('@test.com') || 
      user.email?.includes('donor_') || 
      user.email?.includes('vol_') || 
      user.email?.includes('receiver_')
    );

    logger.info(`Found ${testUsers.length} test users in Auth to delete`);

    for (const user of testUsers) {
      try {
        await admin.auth().deleteUser(user.uid);
        logger.info(`Deleted auth user: ${user.email}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.warn(`Failed to delete auth user ${user.uid}:`, error);
      }
    }

    logger.info(`Deleted ${testUsers.length} test users from Auth`);
  } catch (error: unknown) {
    logger.error("Error cleaning test users from Auth:", error);
    throw error;
  }

}
