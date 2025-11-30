// functions/src/testDataHelpers.ts
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { faker } from "@faker-js/faker";
import { GeminiService, FALLBACK_CONTENT } from "./geminiServices";
import { TEST_IMAGE_URLS } from "./testImageUrl";

export const db = admin.firestore();
export const storage = admin.storage();
const geminiService = new GeminiService();

// Interfaces (keep the same)
export interface UserData {
  uid: string;
  email: string;
  role: string;
  profile: {
    name?: string;
    orgName?: string;
    orgType?: string;
    contactPerson?: string;
    phone: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
    };
  };
  status: string;
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
}

export interface FoodListingData {
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
  status: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  donorType: string;
  foodType: string;
  geolocation: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isTestData: boolean;
}

// Malaysian businesses data (keep the same)
export const MALAYSIAN_DONORS = {
  restaurants: [
    { 
      name: "KFC Malaysia", 
      type: "fast-food", 
      locations: ["Kuala Lumpur", "Petaling Jaya", "Subang Jaya"],
      specialties: ["Fried Chicken", "Burgers", "Fast Food"]
    },
    { 
      name: "McDonald's", 
      type: "fast-food", 
      locations: ["Kuala Lumpur", "Shah Alam", "Klang"],
      specialties: ["Burgers", "Fries", "Fast Food"]
    },
    { 
      name: "Pizza Hut", 
      type: "fast-food", 
      locations: ["Petaling Jaya", "Kuala Lumpur"],
      specialties: ["Pizza", "Pasta", "Italian"]
    },
    { 
      name: "Nando's", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Petaling Jaya"],
      specialties: ["Grilled Chicken", "Portuguese", "Flame-grilled"]
    },
    { 
      name: "PappaRich", 
      type: "restaurant", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Malaysian Food", "Nasi Lemak", "Roti Canai"]
    },
    { 
      name: "The Chicken Rice Shop", 
      type: "restaurant", 
      locations: ["Petaling Jaya", "Klang"],
      specialties: ["Chicken Rice", "Chinese Food", "Rice Dishes"]
    },
    { 
      name: "Secret Recipe", 
      type: "cafe", 
      locations: ["Kuala Lumpur", "Subang Jaya"],
      specialties: ["Cakes", "Western Food", "Pasta"]
    },
    { 
      name: "OldTown White Coffee", 
      type: "cafe", 
      locations: ["Shah Alam", "Klang"],
      specialties: ["Kopitiam Food", "White Coffee", "Local Dishes"]
    },
  ],
  hypermarkets: [
    { 
      name: "AEON BiG", 
      type: "hypermarket", 
      locations: ["Shah Alam", "Kuala Lumpur", "Petaling Jaya"],
      specialties: ["Groceries", "Fresh Produce", "Shelf-stable"]
    },
    { 
      name: "Giant Hypermarket", 
      type: "hypermarket", 
      locations: ["Shah Alam", "Subang Jaya", "Klang"],
      specialties: ["Groceries", "Household Items", "Fresh Food"]
    },
    { 
      name: "Tesco", 
      type: "hypermarket", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Groceries", "International Foods", "Fresh Produce"]
    },
    { 
      name: "NSK Trade City", 
      type: "hypermarket", 
      locations: ["Shah Alam", "Petaling Jaya"],
      specialties: ["Bulk Items", "Local Produce", "Affordable Groceries"]
    },
    { 
      name: "Econsave", 
      type: "hypermarket", 
      locations: ["Klang", "Subang Jaya"],
      specialties: ["Budget Groceries", "Local Products", "Household Essentials"]
    },
    { 
      name: "Mydin", 
      type: "hypermarket", 
      locations: ["Kuala Lumpur", "Shah Alam"],
      specialties: ["Wholesale", "Local Products", "Muslim-friendly"]
    },
  ],
  hotels: [
    { 
      name: "Hilton Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Buffet", "International Cuisine", "Banquet"]
    },
    { 
      name: "Sheraton Imperial", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Wedding Banquet", "Conference Catering", "International"]
    },
    { 
      name: "Le Meridien Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["French Cuisine", "Luxury Dining", "Event Catering"]
    },
    { 
      name: "Concorde Hotel Shah Alam", 
      type: "hotel", 
      locations: ["Shah Alam"],
      specialties: ["Local Cuisine", "Business Events", "Banquet"]
    },
    { 
      name: "Glenmarie Hotel & Golf Resort", 
      type: "hotel", 
      locations: ["Shah Alam"],
      specialties: ["Resort Dining", "Golf Events", "Outdoor Catering"]
    },
    { 
      name: "One World Hotel", 
      type: "hotel", 
      locations: ["Petaling Jaya"],
      specialties: ["Chinese Banquet", "Corporate Events", "International Buffet"]
    },
    { 
      name: "Sunway Resort Hotel", 
      type: "hotel", 
      locations: ["Petaling Jaya"],
      specialties: ["Theme Park Catering", "Large Events", "Family Dining"]
    },
    { 
      name: "Royale Chulan Kuala Lumpur", 
      type: "hotel", 
      locations: ["Kuala Lumpur"],
      specialties: ["Malay Cuisine", "Traditional Banquet", "Cultural Events"]
    },
  ]
};

// Malaysian NGOs (keep the same)
export const MALAYSIAN_NGOS = [
  { name: "Malaysian Red Crescent Society", type: "humanitarian" },
  { name: "Pertubuhan Kebajikan Islam Malaysia", type: "religious" },
  { name: "Rumah Kebajikan Seri Eden", type: "community" },
  { name: "Food Aid Foundation", type: "food-bank" },
  { name: "Kechara Soup Kitchen", type: "food-bank" },
  { name: "Pertiwi Soup Kitchen", type: "food-bank" },
  { name: "Yayasan Sunbeams Home", type: "community" },
  { name: "Project Hope Malaysia", type: "community" },
  { name: "Yayasan MSU", type: "community"},
];

// Food categories for better organization (keep the same)
export const FOOD_CATEGORIES = {
  FAST_FOOD: ["Burgers", "Fried Chicken", "Pizza", "Fries & Snacks"],
  MALAYSIAN_FOOD: ["Nasi Lemak", "Chicken Rice", "Roti Canai", "Laksa", "Satay"],
  SHELF_STABLE: ["Canned Goods", "Rice & Grains", "Cooking Essentials", "Instant Food"],
  FRESH_PRODUCE: ["Vegetables", "Fruits", "Protein", "Bakery"],
  BANQUET_FOOD: ["Buffet", "Banquet", "Corporate Meals", "Hotel Breakfast"]
};

// Image mappings for pre-uploaded images (keep the same)
const DONOR_IMAGE_MAPPING: { [key: string]: string[] } = {
  "KFC Malaysia": ["crispy_chicken_meal", "zinger_burger_combo","hot_spicy_chicken", "family_bucket","snack_plate_fries"],
  "McDonald's": ["big_mac_meal", "chicken_mcnuggets", "filet_o_fish", "breakfast_mcmuffin", "happy_meal"],
  "Pizza Hut": ["supreme_pizza", "cheese_lovers_pizza", "pasta_meal_combo", "garlic_bread_sticks", "mixed_pizza_variety"],
  "Nando's": ["peri_peri_chicken", "grilled_chicken_platter", "flame_grilled_wraps",  "portuguese_rice_meal", "spicy_chicken_quarters"],
  "PappaRich": ["nasi_lemak_set", "roti_canai_combo", "chicken_rice_meal" , "char_kuey_teow", "curry_laksa_bowl"],
  "The Chicken Rice Shop": ["steamed_chicken_rice", "roasted_chicken_combo", "mixed_chicken_platter", "chicken_noodle_soup", "family_chicken_pack"],
  "Secret Recipe": ["chocolate_cake_slice", "grilled_chicken_pasta", "beef_lasagna_meal" , "pastry_assortment","creamy_carbonara"],
  "OldTown White Coffee": ["kopi_breakfast_set", "nasi_lemak_pack", "kaya_toast_combo",  "curry_mee_bowl","white_coffee_snack"],
  "AEON BiG": ["fresh_vegetables_basket", "mixed_fruits_collection", "rice_essentials_pack" ,"canned_goods_variety", "bakery_bread_assortment"],
  "Giant Hypermarket": ["grocery_essentials_pack", "fresh_produce_selection", "household_staples_bundle", "snacks_beverages_box", "frozen_food_variety"],
  "Tesco": ["international_foods_selection", "fresh_meat_seafood", "organic_produce_basket",  "baking_essentials_kit", "ready_eat_meals"],
  "NSK Trade City": ["bulk_rice_grains", "local_produce_special", "affordable_groceries_bundle", "spices_condiments_set","household_value_pack"],
  "Econsave": ["budget_groceries_bundle", "local_products_selection", "essential_food_items", "daily_necessities_box","value_deals_assortment"],
  "Mydin": ["muslim_friendly_groceries", "local_products_variety", "wholesale_essentials_pack", "halal_food_selection","bulk_purchase_bundle"],
  "Hilton Kuala Lumpur": ["international_buffet_selection", "wedding_banquet_leftovers", "conference_lunch_packages", "breakfast_pastry_assortment","fine_dining_surplus"],
  "Sheraton Imperial": ["business_lunch_buffet", "event_catering_surplus", "international_cuisine_selection", "dessert_pastry_collection","corporate_dinner_packages"],
  "Le Meridien Kuala Lumpur": ["french_cuisine_selection", "luxury_dining_leftovers", "event_catering_packages", "gourmet_pastry_assortment","fine_dining_experience"],
  "Concorde Hotel Shah Alam": ["local_cuisine_buffet", "business_event_leftovers", "traditional_malay_dishes", "conference_meal_packages","banquet_food_selection"],
  "Glenmarie Hotel & Golf Resort": ["resort_breakfast_buffet", "golf_event_catering", "outdoor_bbq_leftovers", "family_dining_packages","recreation_meal_selection"],
  "One World Hotel": ["chinese_banquet_leftovers", "corporate_event_packages", "international_buffet_selection",  "wedding_dinner_surplus","business_lunch_assortment"],
  "Sunway Resort Hotel": ["theme_park_catering_pack", "family_buffet_leftovers", "large_event_surplus","kids_meal_packages", "resort_dining_selection"],
  "Royale Chulan Kuala Lumpur": ["malay_traditional_banquet", "cultural_event_leftovers", "royal_dining_experience", "heritage_cuisine_pack", "traditional_dessert_collection"]
};

const NGO_IMAGE_MAPPING: { [key: string]: string[] } = {
  "Malaysian Red Crescent Society": ["emergency_food_distribution", "community_kitchen_setup", "disaster_relief_effort"],
  "Pertubuhan Kebajikan Islam Malaysia": ["religious_food_distribution", "community_support_program", "ramadan_food_packages"],
  "Rumah Kebajikan Seri Eden": ["community_food_drive", "local_family_support", "neighborhood_assistance"],
  "Food Aid Foundation": ["food_bank_operations", "surplus_food_collection", "community_grocery_distribution"],
  "Kechara Soup Kitchen": ["soup_kitchen_operations", "street_feeding_program", "homeless_food_assistance"],
  "Pertiwi Soup Kitchen": ["soup_kitchen_service", "night_food_distribution", "urban_poor_support"],
  "Project Hope Malaysia": ["hope_food_distribution", "community_empowerment", "sustainable_food_program"],
  "Yayasan MSU": ["educational_food_support", "student_meal_program", "campus_food_assistance"]
};

const DOCUMENT_IMAGE_MAPPING: { [key: string]: string[] } = {
  "business-license": ["business_license_1", "business_license_2", "business_license_3"],
  "ngo-certificate": ["ngo_certificate_1", "ngo_certificate_2", "ngo_certificate_3"],
  "id-card": ["id_card_1", "id_card_2", "id_card_3"]
};

// NEW: Simple image URL helper functions
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

// Type-safe helper functions for accessing mappings (keep the same)
function getDonorImages(donorName: string): string[] {
  return DONOR_IMAGE_MAPPING[donorName] || ["default_food"];
}

function getNgoImages(ngoName: string): string[] {
  return NGO_IMAGE_MAPPING[ngoName] || ["default_campaign"];
}

function getDocumentImages(docType: string): string[] {
  return DOCUMENT_IMAGE_MAPPING[docType] || ["default_document"];
}

// Type-safe fallback content accessors (keep the same)
function getFoodTitlesFallback(donorName: string): string[] {
  const fallbackTitles = FALLBACK_CONTENT.foodTitles[donorName as keyof typeof FALLBACK_CONTENT.foodTitles];
  return fallbackTitles || [`Food from ${donorName}`];
}

function getPickupInstructionsFallback(donorType: string): string {
  const instructions = FALLBACK_CONTENT.pickupInstructions[donorType as keyof typeof FALLBACK_CONTENT.pickupInstructions];
  return instructions || FALLBACK_CONTENT.pickupInstructions.default;
}

function getCampaignDescriptionsFallback(category: string): string[] {
  const descriptions = FALLBACK_CONTENT.campaignDescriptions[category as keyof typeof FALLBACK_CONTENT.campaignDescriptions];
  return descriptions || [`Campaign for ${category}`];
}

// Helper functions (keep the same)
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('All retry attempts failed');
}

// User generation functions - UPDATED with new image URL approach
export async function generateUsers(count: number): Promise<UserData[]> {
  const users: UserData[] = [];
  const allDonors = [
    ...MALAYSIAN_DONORS.restaurants,
    ...MALAYSIAN_DONORS.hypermarkets,
    ...MALAYSIAN_DONORS.hotels
  ];

  const donorCount = Math.floor(count * 0.4);
  const volunteerCount = Math.floor(count * 0.2);
  const receiverCount = count - donorCount - volunteerCount;

  let userIndex = 0;

  // Generate donors
  for (let i = 0; i < donorCount; i++) {
    const donor = allDonors[i % allDonors.length];
    const location = faker.helpers.arrayElement(donor.locations);
    const status = faker.helpers.arrayElement([
      'approved', 'approved', 'approved', 'approved', // 80% approved
      'pending', // 10% pending  
      'rejected' // 10% rejected
    ]);
    
    const password = generateSecurePassword();
    const email = generateDonorEmail(donor.name, i);

    // Use pre-uploaded document images - UPDATED
    const documentImages = getDocumentImages("business-license");
    const selectedDocument = faker.helpers.arrayElement(documentImages);
    const documentUrl = getDocumentImageUrl("business-license", selectedDocument);

    const userData: Omit<UserData, 'uid'> = {
      email: email,
      role: 'donor',
      profile: {
        orgName: donor.name,
        orgType: donor.type,
        contactPerson: faker.person.fullName(),
        phone: `01${faker.string.numeric(8)}`,
        address: {
          street: faker.location.streetAddress(),
          city: location,
          postalCode: faker.location.zipCode()
        }
      },
      status: status,
      verification: {
        documentUrl: documentUrl,
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const userWithUid = await createUserWithAuth(userData, userIndex, password);
    users.push(userWithUid);
    userIndex++;
  }

  // Generate volunteers
  for (let i = 0; i < volunteerCount; i++) {
    const ngo = MALAYSIAN_NGOS[i % MALAYSIAN_NGOS.length];
    const status = faker.helpers.arrayElement([
      'approved', 'approved', 'approved', 'approved', // 80% approved
      'pending', // 10% pending  
      'rejected' // 10% rejected
    ]);
    const password = generateSecurePassword();
    const email = `volunteer_${i}_${faker.internet.email()}`;

    // Use pre-uploaded NGO certificate images - UPDATED
    const documentImages = getDocumentImages("ngo-certificate");
    const selectedDocument = faker.helpers.arrayElement(documentImages);
    const documentUrl = getDocumentImageUrl("ngo-certificate", selectedDocument);

    const userData: Omit<UserData, 'uid'> = {
      email: email,
      role: 'volunteer',
      profile: {
        orgName: ngo.name,
        orgType: ngo.type,
        contactPerson: faker.person.fullName(),
        phone: `01${faker.string.numeric(8)}`,
        address: {
          street: faker.location.streetAddress(),
          city: faker.helpers.arrayElement(['Kuala Lumpur', 'Shah Alam', 'Petaling Jaya', 'Klang']),
          postalCode: faker.location.zipCode()
        }
      },
      status: status,
      verification: {
        documentUrl: documentUrl,
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const userWithUid = await createUserWithAuth(userData, userIndex, password);
    users.push(userWithUid);
    userIndex++;
  }

  // Generate receivers
  for (let i = 0; i < receiverCount; i++) {
    const status = faker.helpers.arrayElement([
      'approved', 'approved', 'approved', 'approved', // 80% approved
      'pending', // 10% pending  
      'rejected' // 10% rejected
    ]);
    const password = generateSecurePassword();
    const email = `receiver_${i}_${faker.internet.email()}`;

    // Use pre-uploaded ID card images - UPDATED
    const documentImages = getDocumentImages("id-card");
    const selectedDocument = faker.helpers.arrayElement(documentImages);
    const documentUrl = getDocumentImageUrl("id-card", selectedDocument);

    const userData: Omit<UserData, 'uid'> = {
      email: email,
      role: 'receiver',
      profile: {
        name: faker.person.fullName(),
        phone: `01${faker.string.numeric(8)}`,
        address: {
          street: faker.location.streetAddress(),
          city: faker.helpers.arrayElement(['Kuala Lumpur', 'Shah Alam', 'Petaling Jaya', 'Klang', 'Subang Jaya']),
          postalCode: faker.location.zipCode()
        }
      },
      status: status,
      verification: {
        documentUrl: documentUrl,
        verified: status === 'approved',
        documentUploaded: true,
        uploadedAt: faker.date.past()
      },
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const userWithUid = await createUserWithAuth(userData, userIndex, password);
    users.push(userWithUid);
    userIndex++;
  }

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
      displayName: userData.profile.name || userData.profile.contactPerson,
      disabled: false,
    });

    const userWithUid: UserData = {
      ...userData,
      uid: userRecord.uid,
      testPassword: password
    };

    await db.collection('users').doc(userRecord.uid).set(userWithUid);
    logger.info(`Created user in Auth and Firestore: ${userData.email}`);
    return userWithUid;
  } catch (error: unknown) {
    logger.error(`Failed to create user ${index}:`, error);
    throw error;
  }
}

export function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function generateDonorEmail(businessName: string, index: number): string {
  const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}${index}@test.com`;
}

// Food listing generation with Gemini integration - UPDATED with new image URL approach
export async function generateFoodListingsWithRetry(
  count: number,
  users: UserData[],
  pastMonths: number,
  futureDays: number
): Promise<string[]> {
  return executeWithRetry(async () =>
    await generateFoodListings(count, users, pastMonths, futureDays) 
  );
}

export async function generateFoodListings(
  count: number,
  users: UserData[],
  pastMonths: number,
  futureDays: number
): Promise<string[]> {
  const donors = users.filter((u) => u.role === "donor" && u.status === "approved");
  const listings: string[] = [];

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - pastMonths);

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + futureDays);

  for (let i = 0; i < count; i++) {
    const donor = faker.helpers.arrayElement(donors);
    
    // Get donor details
    const allDonors = [
      ...MALAYSIAN_DONORS.restaurants,
      ...MALAYSIAN_DONORS.hypermarkets,
      ...MALAYSIAN_DONORS.hotels
    ];
    const donorDetails = allDonors.find(d => d.name === donor.profile.orgName);
    
    if (!donorDetails) {
      logger.warn(`Donor details not found for: ${donor.profile.orgName}`);
      continue;
    }

    // Select appropriate category based on donor type
    const category = selectFoodCategory(donorDetails.type, donorDetails.specialties);
    
    // Generate content using Gemini
    let title: string;
    let description: string;
    
    try {
      title = await geminiService.generateFoodTitle(donorDetails, category);
      description = await geminiService.generateFoodDescription(title, donorDetails, category);
    } catch (error) {
      logger.warn("Gemini failed, using fallback content:", error);
      const fallbackTitles = getFoodTitlesFallback(donorDetails.name);
      title = faker.helpers.arrayElement(fallbackTitles);
      description = `Fresh ${category.toLowerCase()} from ${donorDetails.name}. Perfect for immediate consumption.`;
    }

    // Select appropriate image from donor's specific images - UPDATED
    const donorImages = getDonorImages(donorDetails.name);
    const selectedImage = faker.helpers.arrayElement(donorImages);
    const imageUrl = getDonorImageUrl(donorDetails.name, selectedImage);

    // Generate pickup instructions using Gemini
    let pickupInstructions: string;
    try {
      pickupInstructions = await geminiService.generatePickupInstructions(
        donorDetails, 
        donor.profile.contactPerson ?? 'Manager'
      );
    } catch (error) {
      pickupInstructions = getPickupInstructionsFallback(donorDetails.type);
    }

    const isPast = Math.random() > 0.3;
    const availableDate = faker.date.between({
      from: isPast ? pastDate : now,
      to: isPast ? now : futureDate,
    });

    let status: string;
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(now.getHours() - 24);

    if (availableDate < twentyFourHoursAgo) {
      // Past listings: 70% completed, 20% cancelled, 10% approved (rare but possible)
      const rand = Math.random();
      status = rand > 0.3 ? "completed" : "cancelled";
    } else if (availableDate > now) {
      // Future listings: 60% approved, 25% pending, 15% cancelled
      const rand = Math.random();
      status = rand > 0.4 ? "approved" : (rand > 0.15 ? "pending" : "cancelled");
    } else {
      // Current day listings: 40% approved, 30% completed, 20% pending, 10% cancelled
      const rand = Math.random();
      if (rand > 0.6) {
        status = "approved";
      } else if (rand > 0.3) {
        status = "completed";
      } else if (rand > 0.1) {
        status = "pending";
      } else {
        status = "cancelled";
      }
    }

    const totalQuantity = faker.number.int({ min: 10, max: 100 });
    let reservedQuantity = 0;
    let collectedQuantity = 0;

    if (status === "completed") {
      reservedQuantity = totalQuantity;
      collectedQuantity = totalQuantity;
    } else if (status === "approved") {
      reservedQuantity = faker.number.int({ min: 0, max: Math.floor(totalQuantity * 0.8) });
      collectedQuantity = faker.number.int({ min: 0, max: reservedQuantity });
    }

    // Ensure createdAt is always before availableDate
    let createdAt = faker.date.past({ refDate: availableDate });
    if (createdAt > availableDate) {
      createdAt = new Date(availableDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const foodData: FoodListingData = {
      title: title,
      description: description,
      category: category,
      totalQuantity,
      quantityUnit: "portions",
      remainingQuantity: totalQuantity - reservedQuantity,
      reservedQuantity,
      collectedQuantity,
      expiryDate: faker.date.future().toISOString().split("T")[0],
      tags: generateFoodTags(category, donorDetails.type, donorDetails.specialties),
      pickupAddress: `${donor.profile.address.street}, ${donor.profile.address.city}`,
      pickupInstructions: pickupInstructions,
      availableDate: availableDate.toISOString().split("T")[0],
      startTime: getStartTime(determineMealType(category)),
      endTime: getEndTime(determineMealType(category)),
      images: [imageUrl],
      status,
      donorId: donor.uid,
      donorName: donor.profile.orgName ?? 'Unknown Donor',
      donorEmail: donor.email,
      donorType: donorDetails.type,
      foodType: getFoodType(category),
      geolocation: {
        latitude: faker.location.latitude({ min: 2.5, max: 3.5 }),
        longitude: faker.location.longitude({ min: 101, max: 102 }),
        formattedAddress: `${donor.profile.address.street}, ${donor.profile.address.city}`,
      },
      createdAt: createdAt,
      updatedAt: new Date(),
      isTestData: true,
    };

    const docRef = await db.collection("foodListings").add(foodData);
    listings.push(docRef.id);
  }

  return listings;
}

// Helper functions for food listings (keep the same)
function selectFoodCategory(donorType: string, specialties: string[]): string {
  if (donorType === 'hypermarket') {
    return Math.random() > 0.5 ? 
      faker.helpers.arrayElement(FOOD_CATEGORIES.SHELF_STABLE) :
      faker.helpers.arrayElement(FOOD_CATEGORIES.FRESH_PRODUCE);
  } else if (donorType === 'hotel') {
    return faker.helpers.arrayElement(FOOD_CATEGORIES.BANQUET_FOOD);
  } else if (donorType === 'fast-food') {
    return faker.helpers.arrayElement(FOOD_CATEGORIES.FAST_FOOD);
  } else {
    // For restaurants, match food to specialties
    if (specialties.some(s => s.toLowerCase().includes('malaysian') || s.toLowerCase().includes('nasi lemak'))) {
      return faker.helpers.arrayElement(FOOD_CATEGORIES.MALAYSIAN_FOOD);
    } else {
      return Math.random() > 0.5 ? 
        faker.helpers.arrayElement(FOOD_CATEGORIES.FAST_FOOD) :
        faker.helpers.arrayElement(FOOD_CATEGORIES.MALAYSIAN_FOOD);
    }
  }
}

export function determineMealType(category: string): string {
  if (category.includes('Breakfast') || category === 'Bakery') return 'breakfast';
  if (category.includes('Lunch') || category === 'Corporate') return 'lunch';
  return 'dinner';
}

export function getStartTime(mealType: string): string {
  switch (mealType) {
    case 'breakfast': return '07:00';
    case 'lunch': return '11:00';
    case 'dinner': return '17:00';
    default: return '10:00';
  }
}

export function getEndTime(mealType: string): string {
  switch (mealType) {
    case 'breakfast': return '10:00';
    case 'lunch': return '14:00';
    case 'dinner': return '20:00';
    default: return '18:00';
  }
}

export function generateFoodTags(category: string, donorType: string, specialties: string[]): string[] {
  const baseTags = [];
  
  if (donorType === 'hypermarket') {
    baseTags.push('shelf-stable', 'grocery', 'non-perishable');
  } else if (donorType === 'hotel') {
    baseTags.push('banquet', 'freshly-prepared', 'hotel-quality');
  } else if (donorType === 'fast-food') {
    baseTags.push('fast-food', 'quick-meal', 'ready-to-eat');
  } else {
    baseTags.push('freshly-cooked', 'restaurant-quality', 'ready-to-eat');
  }

  specialties.forEach(specialty => {
    baseTags.push(specialty.toLowerCase().replace(/\s+/g, '-'));
  });

  if (category.includes('Vegetable') || category.includes('Fruit')) {
    baseTags.push('fresh-produce', 'healthy', 'vegetarian');
  } else if (category.includes('Chicken') || category.includes('Protein')) {
    baseTags.push('high-protein', 'non-vegetarian');
  } else if (category.includes('Rice') || category.includes('Noodle')) {
    baseTags.push('carbohydrate', 'filling');
  } else if (category.includes('Fast Food')) {
    baseTags.push('quick', 'convenient', 'family-friendly');
  }

  baseTags.push('halal');
  return faker.helpers.arrayElements(baseTags, { min: 3, max: 8 });
}

export function getFoodType(category: string): string {
  const safeCategory = category ?? 'cooked-meals';
  
  if (safeCategory.includes('Canned') || safeCategory.includes('Grains') || safeCategory.includes('Instant')) {
    return 'shelf-stable';
  } else if (safeCategory.includes('Vegetable') || safeCategory.includes('Fruit') || safeCategory.includes('Protein')) {
    return 'fresh-produce';
  } else if (safeCategory.includes('Fast Food')) {
    return 'fast-food';
  } else {
    return 'cooked-meals';
  }
}

// Campaign generation - UPDATED with new image URL approach
export async function generateCampaignsWithRetry(
  count: number, 
  users: UserData[], 
  pastMonths: number, 
  futureDays: number
): Promise<string[]> {
  return executeWithRetry(async () => 
    await generateCampaigns(count, users, pastMonths, futureDays) 
  );
}

export async function generateCampaigns(
  count: number,
  users: UserData[],
  pastMonths: number,
  futureDays: number
): Promise<string[]> {
  const volunteers = users.filter((u) => u.role === "volunteer" && u.status === "approved");
  const campaigns: string[] = [];

  // Define campaign template with description property
  interface CampaignTemplate {
    title: string;
    category: string;
    description?: string;
  }

  const campaignTemplates: CampaignTemplate[] = [
    { title: "Community Food Distribution Drive", category: "Community Outreach" },
    { title: "Elderly Food Assistance Program", category: "Elderly Support" },
    { title: "School Lunch Support Program", category: "Education Support" },
    { title: "Festival Food Drive Initiative", category: "Festival Program" },
    { title: "Emergency Food Relief Operation", category: "Emergency Relief" },
  ];

  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - pastMonths);

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + futureDays);

  for (let i = 0; i < count; i++) {
    const volunteer = faker.helpers.arrayElement(volunteers);
    const template = faker.helpers.arrayElement(campaignTemplates);

    // Get NGO details
    const ngoDetails = MALAYSIAN_NGOS.find(ngo => ngo.name === volunteer.profile.orgName);
    
    if (!ngoDetails) {
      logger.warn(`NGO details not found for: ${volunteer.profile.orgName}`);
      continue;
    }

    const campaignDate = faker.date.between({
      from: pastDate,
      to: futureDate,
    });

    let status: string;
    if (campaignDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
      // Past campaigns: 80% completed, 15% cancelled, 5% ongoing (rare)
      const rand = Math.random();
      status = rand > 0.2 ? "completed" : (rand > 0.05 ? "cancelled" : "ongoing");
    } else if (campaignDate > now) {
      // Future campaigns: 50% ongoing, 30% pending, 20% cancelled
      const rand = Math.random();
      status = rand > 0.5 ? "ongoing" : (rand > 0.2 ? "pending" : "cancelled");
    } else {
      // Today: 40% ongoing, 35% completed, 15% pending, 10% cancelled
      const rand = Math.random();
      if (rand > 0.6) {
        status = "ongoing";
      } else if (rand > 0.25) {
        status = "completed";
      } else if (rand > 0.1) {
        status = "pending";
      } else {
        status = "cancelled";
      }
    }

    const totalSpots = faker.number.int({ min: 20, max: 100 });
    let registeredSpots = 0;

    if (status === "completed") {
      registeredSpots = totalSpots;
    } else if (status === "ongoing") {
      registeredSpots = faker.number.int({ min: 0, max: Math.floor(totalSpots * 0.9) });
    }

    const availableSpots = totalSpots - registeredSpots;

    // Generate campaign description using Gemini
    let description: string;
    try {
      description = await geminiService.generateCampaignDescription(ngoDetails, template);
    } catch (error) {
      logger.warn("Gemini failed for campaign description, using fallback:", error);
      const fallbackDescriptions = getCampaignDescriptionsFallback(template.category);
      description = faker.helpers.arrayElement(fallbackDescriptions);
    }

    // Select appropriate image from NGO's specific images - UPDATED
    const ngoImages = getNgoImages(ngoDetails.name);
    const selectedImage = faker.helpers.arrayElement(ngoImages);
    const imageUrl = getNgoImageUrl(ngoDetails.name, selectedImage);

    // Ensure createdAt is always before campaignDate
    let createdAt = faker.date.past({ refDate: campaignDate });
    if (createdAt > campaignDate) {
      createdAt = new Date(campaignDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const campaignData = {
      title: template.title,
      description: description,
      category: template.category,
      campaignDate: campaignDate.toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "17:00",
      locationName: `${volunteer.profile.address.city} Community Center`,
      fullAddress: `${volunteer.profile.address.street}, ${volunteer.profile.address.city}`,
      totalSpots,
      registeredSpots,
      availableSpots,
      images: [imageUrl],
      status,
      organizerId: volunteer.uid,
      organizerName: volunteer.profile.orgName ?? 'Unknown Organization',
      organizerEmail: volunteer.email,
      organizerOrg: volunteer.profile.orgName,
      geolocation: {
        latitude: faker.location.latitude({ min: 2.5, max: 3.5 }),
        longitude: faker.location.longitude({ min: 101, max: 102 }),
        formattedAddress: `${volunteer.profile.address.street}, ${volunteer.profile.address.city}`,
      },
      createdAt: createdAt,
      updatedAt: new Date(),
      isTestData: true,
    };

    const docRef = await db.collection("campaigns").add(campaignData);
    campaigns.push(docRef.id);
  }

  return campaigns;
}

// Reservations and ratings generation (keep the same)
export async function generateReservationsAndRatings(
  users: UserData[], 
  foodListingIds: string[], 
  campaignIds: string[]
) {
  const receivers = users.filter(u => u.role === 'receiver' && u.status === 'approved');
  
  const reservations: string[] = [];
  const registrations: string[] = [];
  const ratings: string[] = [];

  // Track which users have already reserved which listings
  const userReservationMap = new Map<string, Set<string>>();

  // Generate food reservations
  for (const listingId of foodListingIds) {
    const listingDoc = await db.collection('foodListings').doc(listingId).get();
    const listing = listingDoc.data();
    
    if (listing && listing.status === 'completed' && listing.reservedQuantity > 0) {
      let remainingReserved = listing.reservedQuantity;
      const availableReceivers = [...receivers];
      
      // Shuffle receivers to ensure random distribution
      for (let i = availableReceivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableReceivers[i], availableReceivers[j]] = [availableReceivers[j], availableReceivers[i]];
      }
      
      for (const user of availableReceivers) {
        if (remainingReserved <= 0) break;
        
        // Check if user already reserved this listing
        if (!userReservationMap.has(user.uid)) {
          userReservationMap.set(user.uid, new Set());
        }
        if (userReservationMap.get(user.uid)!.has(listingId)) {
          continue;
        }
        
        const maxQuantity = Math.min(5, remainingReserved);
        const quantity = remainingReserved <= maxQuantity ? remainingReserved : faker.number.int({ min: 1, max: maxQuantity });
        
        // Date calculations
        const createdAt = listing.createdAt instanceof Date ? listing.createdAt : new Date(listing.createdAt);
        const availableDate = new Date(listing.availableDate);
        
        let reservedAt: Date;
        if (createdAt < availableDate) {
          reservedAt = faker.date.between({
            from: createdAt,
            to: availableDate
          });
        } else {
          reservedAt = faker.date.between({
            from: new Date(availableDate.getTime() - 24 * 60 * 60 * 1000),
            to: availableDate
          });
        }
        
        // Create pickup date/time
        const pickupDate = new Date(listing.availableDate);
        const [startHour, startMinute] = listing.startTime.split(':').map(Number);
        const [endHour, endMinute] = listing.endTime.split(':').map(Number);
        
        const pickupStartTime = new Date(pickupDate);
        pickupStartTime.setHours(startHour, startMinute, 0, 0);
        
        const pickupEndTime = new Date(pickupDate);
        pickupEndTime.setHours(endHour, endMinute, 0, 0);
        
        let pickupTime: Date;
        if (pickupStartTime < pickupEndTime) {
          pickupTime = faker.date.between({
            from: pickupStartTime,
            to: pickupEndTime
          });
        } else {
          pickupTime = new Date(pickupStartTime.getTime() + 30 * 60 * 1000);
        }

        const reservationData = {
          foodListingId: listingId,
          userId: user.uid,
          userType: user.role,
          quantity,
          status: 'completed',
          reservedAt: reservedAt,
          pickedUpAt: pickupTime,
          updatedAt: new Date(),
          userName: user.profile.name ?? 'Test User',
          userEmail: user.email,
          userPhone: user.profile.phone,
          donorId: listing.donorId,
          donorName: listing.donorName,
          isTestData: true
        };

        const reservationRef = await db.collection('foodReservations').add(reservationData);
        reservations.push(reservationRef.id);
        userReservationMap.get(user.uid)!.add(listingId);

        // Generate rating for completed reservations (60% chance)
        if (Math.random() > 0.4) {
          const isPositive = Math.random() > 0.2;
          
          let comment: string;
          try {
            comment = await geminiService.generateRatingComment('food', listing.title, isPositive, isPositive ? 5 : 3);
          } catch (error) {
            const commentPool = isPositive ? FALLBACK_CONTENT.ratingComments.positive : FALLBACK_CONTENT.ratingComments.constructive;
            comment = faker.helpers.arrayElement(commentPool);
          }

          let ratingCreatedAt: Date;
          const maxRatingDate = new Date(pickupTime.getTime() + 24 * 60 * 60 * 1000);
          if (pickupTime < maxRatingDate) {
            ratingCreatedAt = faker.date.between({
              from: pickupTime,
              to: maxRatingDate
            });
          } else {
            ratingCreatedAt = new Date(pickupTime.getTime() + 2 * 60 * 60 * 1000);
          }

          const ratingData = {
            targetType: 'food',
            targetId: listingId,
            targetName: listing.title,
            ratedUserId: listing.donorId,
            ratedUserName: listing.donorName,
            ratedUserType: 'donor',
            raterUserId: user.uid,
            raterUserName: user.profile.name ?? 'Test User',
            raterUserType: user.role,
            rating: isPositive ? faker.number.int({ min: 4, max: 5 }) : faker.number.int({ min: 2, max: 3 }),
            comment: comment,
            reservationId: reservationRef.id,
            createdAt: ratingCreatedAt,
            updatedAt: new Date(),
            isTestData: true
          };

          const ratingRef = await db.collection('ratings').add(ratingData);
          ratings.push(ratingRef.id);
        }

        remainingReserved -= quantity;
        if (remainingReserved <= 0) break;
      }
    }
  }

  // Generate campaign registrations
  const userCampaignMap = new Map<string, Set<string>>();

  for (const campaignId of campaignIds) {
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    const campaign = campaignDoc.data();
    
    if (campaign && campaign.status === 'completed' && campaign.registeredSpots > 0) {
      let remainingSpots = campaign.registeredSpots;
      const availableReceivers = [...receivers];
      
      for (let i = availableReceivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableReceivers[i], availableReceivers[j]] = [availableReceivers[j], availableReceivers[i]];
      }
      
      for (const user of availableReceivers) {
        if (remainingSpots <= 0) break;
        
        if (!userCampaignMap.has(user.uid)) {
          userCampaignMap.set(user.uid, new Set());
        }
        if (userCampaignMap.get(user.uid)!.has(campaignId)) {
          continue;
        }
        
        const spotsToTake = Math.min(2, remainingSpots);
        
        const createdAt = campaign.createdAt instanceof Date ? campaign.createdAt : new Date(campaign.createdAt);
        const campaignDate = new Date(campaign.campaignDate);
        
        let registeredAt: Date;
        if (createdAt < campaignDate) {
          registeredAt = faker.date.between({
            from: createdAt,
            to: campaignDate
          });
        } else {
          registeredAt = faker.date.between({
            from: new Date(campaignDate.getTime() - 24 * 60 * 60 * 1000),
            to: campaignDate
          });
        }
        
        const [startHour, startMinute] = campaign.startTime.split(':').map(Number);
        const [endHour, endMinute] = campaign.endTime.split(':').map(Number);
        
        const attendedStartTime = new Date(campaignDate);
        attendedStartTime.setHours(startHour, startMinute, 0, 0);
        
        const attendedEndTime = new Date(campaignDate);
        attendedEndTime.setHours(endHour, endMinute, 0, 0);
        
        let attendedTime: Date;
        if (attendedStartTime < attendedEndTime) {
          attendedTime = faker.date.between({
            from: attendedStartTime,
            to: attendedEndTime
          });
        } else {
          attendedTime = new Date(attendedStartTime.getTime() + 60 * 60 * 1000);
        }

        const registrationData = {
          campaignId,
          userId: user.uid,
          status: 'attended',
          registeredAt: registeredAt,
          attendedAt: attendedTime,
          updatedAt: new Date(),
          userName: user.profile.name ?? 'Test User',
          userEmail: user.email,
          userPhone: user.profile.phone,
          organizerId: campaign.organizerId,
          organizerName: campaign.organizerName,
          isTestData: true
        };

        const registrationRef = await db.collection('campaignRegistrations').add(registrationData);
        registrations.push(registrationRef.id);
        userCampaignMap.get(user.uid)!.add(campaignId);

        // Generate rating for attended campaigns (50% chance)
        if (Math.random() > 0.5) {
          const isPositive = Math.random() > 0.3;
          
          let comment: string;
          try {
            comment = await geminiService.generateRatingComment('campaign', campaign.title, isPositive, isPositive ? 5 : 3);
          } catch (error) {
            const commentPool = isPositive ? FALLBACK_CONTENT.ratingComments.positive : FALLBACK_CONTENT.ratingComments.constructive;
            comment = faker.helpers.arrayElement(commentPool);
          }

          let ratingCreatedAt: Date;
          const maxRatingDate = new Date(attendedTime.getTime() + 24 * 60 * 60 * 1000);
          if (attendedTime < maxRatingDate) {
            ratingCreatedAt = faker.date.between({
              from: attendedTime,
              to: maxRatingDate
            });
          } else {
            ratingCreatedAt = new Date(attendedTime.getTime() + 2 * 60 * 60 * 1000);
          }

          const ratingData = {
            targetType: 'campaign',
            targetId: campaignId,
            targetName: campaign.title,
            ratedUserId: campaign.organizerId,
            ratedUserName: campaign.organizerName,
            ratedUserType: 'volunteer',
            raterUserId: user.uid,
            raterUserName: user.profile.name ?? 'Test User',
            raterUserType: 'receiver',
            rating: isPositive ? faker.number.int({ min: 4, max: 5 }) : faker.number.int({ min: 2, max: 3 }),
            comment: comment,
            createdAt: ratingCreatedAt,
            updatedAt: new Date(),
            isTestData: true
          };

          const ratingRef = await db.collection('ratings').add(ratingData);
          ratings.push(ratingRef.id);
        }

        remainingSpots -= spotsToTake;
        if (remainingSpots <= 0) break;
      }
    }
  }

  return { reservations, registrations, ratings };
}

// Report generation - UPDATED with new image URL approach
export async function generateReports(users: UserData[], foodListingIds: string[], campaignIds: string[]) {
  const reports: string[] = [];
  const approvedUsers = users.filter(u => u.status === 'approved');

  for (let i = 0; i < 30; i++) {
    const reporter = faker.helpers.arrayElement(approvedUsers);
    const targetType = faker.helpers.arrayElement(['food', 'campaign', 'user']) as 'food' | 'campaign' | 'user';
    
    let targetId, targetName, reportedUser;

    if (targetType === 'food') {
      targetId = faker.helpers.arrayElement(foodListingIds);
      const listingDoc = await db.collection('foodListings').doc(targetId).get();
      const listing = listingDoc.data();
      targetName = listing?.title || 'Test Food Listing';
      const donorUser = approvedUsers.find(u => u.uid === listing?.donorId && u.role === 'donor');
      reportedUser = {
        id: listing?.donorId || 'test_donor',
        name: donorUser?.profile.orgName || listing?.donorName || 'Test Donor',
        email: donorUser?.email || listing?.donorEmail || 'test@donor.com',
        type: 'donor'
      };
    } else if (targetType === 'campaign') {
      targetId = faker.helpers.arrayElement(campaignIds);
      const campaignDoc = await db.collection('campaigns').doc(targetId).get();
      const campaign = campaignDoc.data();
      targetName = campaign?.title || 'Test Campaign';
      const volunteerUser = approvedUsers.find(u => u.uid === campaign?.organizerId && u.role === 'volunteer');
      reportedUser = {
        id: campaign?.organizerId || 'test_volunteer',
        name: volunteerUser?.profile.orgName || campaign?.organizerName || 'Test Volunteer',
        email: volunteerUser?.email || campaign?.organizerEmail || 'test@volunteer.com',
        type: 'volunteer'
      };
    } else {
      const reported = faker.helpers.arrayElement(approvedUsers.filter(u => u.uid !== reporter.uid));
      targetName = reported.profile.orgName || reported.profile.name || 'Test User';
      reportedUser = {
        id: reported.uid,
        name: targetName,
        email: reported.email,
        type: reported.role
      };
    }

    const reportStatus = faker.helpers.arrayElement(['pending', 'under_review', 'resolved', 'dismissed']);
    const reason = faker.helpers.arrayElement(['Late delivery', 'Poor quality', 'Rude behavior', 'No show', 'Inappropriate content']);
    const severity = faker.helpers.arrayElement(['low', 'medium', 'high']);

    // Generate report description using Gemini
    let description: string;
    try {
      description = await geminiService.generateReportDescription(
        targetType, 
        targetName, 
        reason, 
        severity,
        reportedUser.name
      );
    } catch (error) {
      description = `Test report for ${targetType}: ${targetName}. Reason: ${reason}. This is automatically generated test data.`;
    }

    // Use pre-uploaded evidence images - UPDATED
    const evidenceImages = ["evidence_1", "evidence_2", "evidence_3"];
    const selectedEvidence = faker.helpers.arrayElement(evidenceImages);
    const evidenceUrl = getEvidenceImageUrl(selectedEvidence);
    
    const reportData = {
      reportType: targetType,
      targetId: targetType !== 'user' ? targetId : undefined,
      targetName,
      reportedUser,
      reporterUser: {
        id: reporter.uid,
        name: reporter.profile.orgName || reporter.profile.name || 'Test User',
        email: reporter.email
      },
      reason: reason,
      description: description,
      severity: severity,
      evidenceUrls: [evidenceUrl],
      status: reportStatus,
      adminNotes: reportStatus !== 'pending' ? 'Test admin notes for this report. Investigation completed.' : null,
      resolvedAt: reportStatus === 'resolved' ? faker.date.recent() : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      isTestData: true
    };

    const reportRef = await db.collection('reports').add(reportData);
    reports.push(reportRef.id);
  }

  return reports;
}

// Data cleaning functions (keep the same)
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
      user.email?.includes('volunteer_') || 
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