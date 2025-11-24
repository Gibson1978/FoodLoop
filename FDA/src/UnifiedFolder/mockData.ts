// Mock data for food items and campaigns

export const mockFoodItems = [
  {
    id: "1",
    title: "Fresh Vegetables Bundle",
    description: "A wonderful assortment of fresh carrots, broccoli, and colorful bell peppers straight from our garden. These vegetables were harvested this morning and are perfect for making healthy meals. All organic and pesticide-free.",
    category: "Fresh Produce",
    quantity: "5-6 servings",
    donor: {
      id: "donor1",
      name: "Green Garden Market",
      rating: 4.8,
      reviewCount: 127,
      avatar: "",
      verified: true,
      type: "grocery"
    },
    location: {
      address: "123 Green Street, Downtown",
      distance: "0.8 km",
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    timing: {
      expiryTime: "2 hours",
      pickupTime: "Anytime today (9AM - 6PM)",
      postedTime: "Posted 30 minutes ago",
      timeOption: "today"
    },
    images: [
      "https://images.unsplash.com/photo-1619369575639-906f8b35107f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHZlZ2V0YWJsZXMlMjBmb29kfGVufDF8fHx8MTc1NzMxNTc3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    allergens: [],
    dietaryNeeds: ["vegetarian", "allergen-free"],
    specialNotes: "Please bring your own bag. Pickup from the back entrance.",
    available: true,
    bestBefore: "2024-09-25", // Changed to date format
    foodTags: ["Organic", "Local", "Fresh"],
    pickupLocation: "Green Garden Market, 123 Main St",
    instruction: "Please bring your own bag. Available at front counter.",
    availableFrom: "2024-09-25T14:00:00", // ISO format for dates
    availableUntil: "2024-09-25T20:00:00",
    pickupInstructions: "Please bring your own bag. Pickup from the back entrance.",
    // New fields from UploadFoodTab
    dailyStartTime: "09:00",
    dailyEndTime: "18:00",
    // Rating system fields
    ratings: [
      {
        userId: "user1",
        rating: 5,
        comment: "Fresh and amazing quality!",
        createdAt: "2024-09-20"
      },
      {
        userId: "user2", 
        rating: 4,
        comment: "Good vegetables, will get again",
        createdAt: "2024-09-19"
      }
    ],
    averageRating: 4.8,
    totalRatings: 127,
    createdAt: "2024-09-25T10:00:00",
    updatedAt: "2024-09-25T10:00:00",
    createdBy: "donor1"
  },
  {
    id: "2",
    title: "Fresh Bread Loaves",
    description: "Artisan sourdough and whole wheat bread baked this morning. Perfect for sandwiches or toast. Made with organic flour and traditional methods.",
    category: "Cooked Food",
    quantity: "8 loaves",
    donor: {
      id: "donor1",
      name: "City Bakery",
      rating: 4.6,
      reviewCount: 89,
      avatar: "",
      verified: true,
      type: "restaurant"
    },
    location: {
      address: "456 Oak Avenue, Midtown",
      distance: "1.2 km",
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    timing: {
      expiryTime: "4 hours",
      pickupTime: "Today 3PM - 7PM",
      postedTime: "Posted 1 hour ago",
      timeOption: "today"
    },
    images: [
      "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    allergens: ["Gluten"],
    dietaryNeeds: ["vegetarian"],
    specialNotes: "Ring the back door bell. Ask for Sarah.",
    available: true,
    bestBefore: "2024-09-26",
    foodTags: ["Artisan", "Fresh Baked"],
    pickupLocation: "City Bakery, 456 Oak Ave",
    instruction: "Ring the back door bell. Ask for Sarah.",
    availableFrom: "2024-09-25T15:00:00",
    availableUntil: "2024-09-25T19:00:00",
    pickupInstructions: "Ring the back door bell. Ask for Sarah.",
    dailyStartTime: "15:00",
    dailyEndTime: "19:00",
    ratings: [
      {
        userId: "user3",
        rating: 5,
        comment: "Best bread in town!",
        createdAt: "2024-09-20"
      }
    ],
    averageRating: 4.6,
    totalRatings: 89,
    createdAt: "2024-09-25T11:00:00",
    updatedAt: "2024-09-25T11:00:00",
    createdBy: "donor1"
  },
  {
    id: "3",
    title: "Community Meal Prep",
    description: "Homemade vegetarian lasagna portions ready for pickup - serves 4-6 people. Made with fresh vegetables, organic pasta, and homemade sauce.",
    category: "Cooked Meals",
    quantity: "3 portions",
    donor: {
      id: "donor3",
      name: "Community Kitchen",
      rating: 4.9,
      reviewCount: 156,
      avatar: "",
      verified: true,
      type: "restaurant"
    },
    location: {
      address: "789 Community Blvd, Downtown",
      distance: "2.1 km",
      coordinates: { lat: 40.7505, lng: -73.9934 }
    },
    timing: {
      expiryTime: "6 hours",
      pickupTime: "Today 5PM - 9PM",
      postedTime: "Posted 45 minutes ago",
      timeOption: "today"
    },
    images: [
      "https://images.unsplash.com/photo-1675856899680-e7e1a83b8bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmb29kJTIwc2hhcmluZ3xlbnwxfHx8fDE3NTczMjY1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    allergens: ["Dairy"],
    dietaryNeeds: ["vegetarian"],
    specialNotes: "Containers provided. Please arrive on time.",
    available: true,
    bestBefore: "2024-09-25",
    foodTags: ["Vegetarian", "Homemade", "Family Size"],
    pickupLocation: "Community Kitchen, 789 Community Blvd",
    instruction: "Containers provided. Please arrive on time.",
    availableFrom: "2024-09-25T17:00:00",
    availableUntil: "2024-09-25T21:00:00",
    pickupInstructions: "Containers provided. Please arrive on time.",
    dailyStartTime: "17:00",
    dailyEndTime: "21:00",
    ratings: [],
    averageRating: 4.9,
    totalRatings: 156,
    createdAt: "2024-09-25T12:00:00",
    updatedAt: "2024-09-25T12:00:00",
    createdBy: "donor3"
  },
  // Add remaining food items with similar structure...
];

export const mockCampaigns = [
  {
    id: "1",
    title: "Community Food Distribution",
    description: "Weekly food distribution with fresh produce, bread, and prepared meals for families in need.",
    organizer: {
      id: "org1",
      name: "Community Kitchen",
      rating: 4.9,
      campaignsOrganized: 23,
      avatar: "",
      verified: true,
      joinedSince: "Member since 2022",
      type: "restaurant"
    },
    // Updated to match CreateCampaignTab form
    category: "Fresh Produce", // From form dropdown
    foodCategory: "fresh-produce", // Keep original for compatibility
    date: "2024-09-09", // Date format for form
    time: "10:00", // Time format for form
    dateTime: "Saturday, Sept 9, 10:00 AM",
    duration: "4 hours",
    estimatedDuration: "4+ hours", // From form
    locationName: "Central Park Community Center",
    address: "123 Central Park Dr, Downtown",
    distance: "1.2 km",
    totalSpots: 150,
    maxVolunteers: 150, // From form
    reservedSpots: 125,
    remainingSpots: 25,
    image: "https://images.unsplash.com/photo-1675856899680-e7e1a83b8bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmb29kJTIwc2hhcmluZ3xlbnwxfHx8fDE3NTczMjY1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    images: [
      "https://images.unsplash.com/photo-1675856899680-e7e1a83b8bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmb29kJTIwc2hhcmluZ3xlbnwxfHx8fDE3NTczMjY1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    location: {
      address: "Central Park Community Center, 123 Park Ave",
      distance: "1.2 km",
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    timing: {
      date: "Saturday, Sept 9",
      startTime: "10:00 AM",
      endTime: "2:00 PM",
      duration: "4 hours",
      postedTime: "Posted 2 days ago",
      timeOption: "today"
    },
    pickupInstructions: "Bring your own bags. Check in at the registration table upon arrival.",
    impactGoals: {
      familiesServed: "150+ families",
      foodDistributed: "5,000 lbs of fresh food",
      communityImpact: "Supporting food security in downtown area"
    },
    status: "active",
    urgent: false,
    dietaryNeeds: ["vegetarian", "allergen-free"],
    // Rating system for campaigns
    ratings: [
      {
        userId: "user4",
        rating: 5,
        comment: "Well organized and great impact!",
        createdAt: "2024-09-20"
      },
      {
        userId: "user5",
        rating: 4,
        comment: "Good initiative, could use more volunteers",
        createdAt: "2024-09-19"
      }
    ],
    averageRating: 4.9,
    totalRatings: 23,
    // Volunteer management
    volunteers: ["user1", "user2", "user3"],
    // New fields for campaign creation
    createdBy: "org1",
    createdAt: "2024-09-23T08:00:00",
    updatedAt: "2024-09-23T08:00:00",
    // Additional form fields
    specialInstructions: "Wear comfortable shoes and bring water"
  },
  {
    id: "2",
    title: "School Weekend Meal Program",
    description: "Pre-packed weekend meals for school children from low-income families.",
    organizer: {
      id: "org2",
      name: "Helping Hands Volunteers",
      rating: 4.7,
      campaignsOrganized: 15,
      avatar: "",
      verified: true,
      joinedSince: "Member since 2023",
      type: "restaurant"
    },
    category: "Cooked Meals",
    foodCategory: "cooked-meals",
    date: "2024-09-11",
    time: "11:00",
    dateTime: "Monday, Sept 11, 11:00 AM",
    duration: "2 hours",
    estimatedDuration: "2-3 hours",
    locationName: "Roosevelt Elementary School",
    address: "456 School Street, East District",
    distance: "2.5 km",
    totalSpots: 200,
    maxVolunteers: 200,
    reservedSpots: 195,
    remainingSpots: 5,
    image: "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    images: [
      "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    location: {
      address: "Roosevelt Elementary School, 456 School Street",
      distance: "2.5 km",
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    timing: {
      date: "Monday, Sept 11",
      startTime: "11:00 AM",
      endTime: "1:00 PM",
      duration: "2 hours",
      postedTime: "Posted 1 day ago",
      timeOption: "today"
    },
    pickupInstructions: "For registered families only. Present ID at the school cafeteria.",
    impactGoals: {
      familiesServed: "200+ children",
      foodDistributed: "400 meal packages",
      communityImpact: "Supporting childhood nutrition in East District"
    },
    status: "active",
    urgent: true,
    dietaryNeeds: ["vegetarian", "halal"],
    ratings: [],
    averageRating: 4.7,
    totalRatings: 15,
    volunteers: ["user4", "user5", "user6"],
    createdBy: "org2",
    createdAt: "2024-09-24T09:00:00",
    updatedAt: "2024-09-24T09:00:00",
    specialInstructions: "Please arrive 15 minutes early for briefing"
  },
  // Add remaining campaigns with similar structure...
];

// Additional data for user ratings
export const mockUsers = [
  {
    id: "user1",
    name: "John Doe",
    email: "john@example.com",
    avatar: "",
    role: "volunteer",
    joinedDate: "2024-01-15",
    totalDonations: 5,
    totalVolunteerHours: 24,
    rating: 4.8,
    reviews: [
      {
        campaignId: "1",
        rating: 5,
        comment: "Great volunteer! Very helpful.",
        createdAt: "2024-09-20"
      }
    ]
  },
  {
    id: "donor1", 
    name: "Green Garden Market",
    email: "contact@greengarden.com",
    avatar: "",
    role: "donor",
    joinedDate: "2023-11-10",
    totalListings: 15,
    totalFoodDonated: "250+ kg",
    rating: 4.8,
    reviews: [
      {
        foodId: "1",
        rating: 5,
        comment: "Fresh and high quality produce!",
        createdAt: "2024-09-20"
      }
    ]
  }
];

// Categories for forms (standardized)
export const foodCategories = [
  'Fresh Produce',
  'Shelf Stable', 
  'Cooked Meals'
];

export const campaignCategories = [
  { value: 'fresh', label: 'Fresh Produce' },
  { value: 'canned', label: 'Canned Items' },
  { value: 'packaged', label: 'Packaged Foods' },
  { value: 'mixed', label: 'Mixed Items' }
];

export const mockCompletedFoodItems = [
  {
    id: "7",
    title: "Bakery Surplus",
    description: "Fresh bread and pastries from our daily bake that need to find good homes.",
    category: "Bakery Items",
    quantity: "20 pieces",
    donor: {
      id: "donor1",
      name: "Green Garden Market",
      rating: 4.8,
      reviewCount: 127,
      avatar: "",
      verified: true,
      type: "grocery"
    },
    location: {
      address: "123 Green Street, Downtown",
      distance: "0.8 km",
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    timing: {
      expiryTime: "Completed",
      pickupTime: "Completed",
      postedTime: "Posted 1 week ago",
      timeOption: "completed"
    },
    images: [
      "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    allergens: ["Gluten"],
    dietaryNeeds: ["vegetarian"],
    specialNotes: "Successfully donated to local shelter",
    available: false,
    bestBefore: "2024-09-06",
    foodTags: ["Bakery", "Fresh", "Donated"],
    pickupLocation: "Green Garden Market, 123 Main St",
    instruction: "Completed - Donated to shelter",
    availableFrom: "2024-09-01T08:00:00",
    availableUntil: "2024-09-06T18:00:00",
    pickupInstructions: "Completed - Donated to shelter",
    dailyStartTime: "08:00",
    dailyEndTime: "18:00",
    // Completion details
    status: "completed",
    pickedUpDate: "2024-09-06",
    recipient: "Local Shelter",
    impact: "15 people fed",
    ratings: [
      {
        userId: "user1",
        rating: 5,
        comment: "Amazing quality! The shelter was very grateful.",
        createdAt: "2024-09-06"
      }
    ],
    averageRating: 5,
    totalRatings: 1,
    createdAt: "2024-09-01T10:00:00",
    updatedAt: "2024-09-06T16:00:00",
    createdBy: "donor1"
  },
  {
    id: "8",
    title: "Canned Goods Collection",
    description: "Assorted canned vegetables, soups, and beans for community distribution.",
    category: "Canned Goods",
    quantity: "25 items",
    donor: {
      id: "donor1",
      name: "Green Garden Market",
      rating: 4.8,
      reviewCount: 127,
      avatar: "",
      verified: true,
      type: "grocery"
    },
    location: {
      address: "123 Green Street, Downtown",
      distance: "0.8 km",
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    timing: {
      expiryTime: "Completed",
      pickupTime: "Completed",
      postedTime: "Posted 2 weeks ago",
      timeOption: "completed"
    },
    images: [
      "https://images.unsplash.com/photo-1586201375761-83865001e544?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW5uZWQlMjBmb29kfGVufDF8fHx8MTc1NzMxNTc3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    allergens: [],
    dietaryNeeds: ["vegetarian", "allergen-free"],
    specialNotes: "Donated to family in need",
    available: false,
    bestBefore: "2024-09-05",
    foodTags: ["Canned", "Non-Perishable", "Community"],
    pickupLocation: "Green Garden Market, 123 Main St",
    instruction: "Completed - Donated to family",
    availableFrom: "2024-08-28T08:00:00",
    availableUntil: "2024-09-05T18:00:00",
    pickupInstructions: "Completed - Donated to family",
    dailyStartTime: "08:00",
    dailyEndTime: "18:00",
    // Completion details
    status: "completed",
    pickedUpDate: "2024-09-05",
    recipient: "Family of 4",
    impact: "1 week of meals",
    ratings: [],
    averageRating: 0,
    totalRatings: 0,
    createdAt: "2024-08-28T09:00:00",
    updatedAt: "2024-09-05T15:00:00",
    createdBy: "donor1"
  }
];

export const mockCompletedCampaigns = [
  {
    id: "7",
    title: "Community Food Distribution",
    description: "Weekly food distribution with fresh produce, bread, and prepared meals for families in need.",
    organizer: {
      id: "org1",
      name: "Community Kitchen",
      rating: 4.9,
      campaignsOrganized: 23,
      avatar: "",
      verified: true,
      joinedSince: "Member since 2022",
      type: "restaurant"
    },
    category: "Fresh Produce",
    foodCategory: "fresh-produce",
    date: "2024-09-02",
    time: "10:00",
    dateTime: "Saturday, Sept 2, 10:00 AM",
    duration: "4 hours",
    estimatedDuration: "4+ hours",
    locationName: "Central Park Community Center",
    address: "123 Central Park Dr, Downtown",
    distance: "1.2 km",
    totalSpots: 150,
    maxVolunteers: 150,
    reservedSpots: 150,
    remainingSpots: 0,
    image: "https://images.unsplash.com/photo-1675856899680-e7e1a83b8bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmb29kJTIwc2hhcmluZ3xlbnwxfHx8fDE3NTczMjY1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    images: [
      "https://images.unsplash.com/photo-1675856899680-e7e1a83b8bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBmb29kJTIwc2hhcmluZ3xlbnwxfHx8fDE3NTczMjY1Njd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    location: {
      address: "Central Park Community Center, 123 Park Ave",
      distance: "1.2 km",
      coordinates: { lat: 40.7128, lng: -74.0060 }
    },
    timing: {
      date: "Saturday, Sept 2",
      startTime: "10:00 AM",
      endTime: "2:00 PM",
      duration: "4 hours",
      postedTime: "Posted 1 week ago",
      timeOption: "completed"
    },
    pickupInstructions: "Bring your own bags. Check in at the registration table upon arrival.",
    impactGoals: {
      familiesServed: "150+ families",
      foodDistributed: "5,000 lbs of fresh food",
      communityImpact: "Supporting food security in downtown area"
    },
    status: "completed",
    urgent: false,
    dietaryNeeds: ["vegetarian", "allergen-free"],
    ratings: [
      {
        userId: "user4",
        rating: 5,
        comment: "Well organized and great impact!",
        createdAt: "2024-09-20"
      },
      {
        userId: "user5",
        rating: 4,
        comment: "Good initiative, could use more volunteers",
        createdAt: "2024-09-19"
      }
    ],
    averageRating: 4.9,
    totalRatings: 23,
    volunteers: ["user1", "user2", "user3"],
    createdBy: "org1",
    createdAt: "2024-08-26T08:00:00",
    updatedAt: "2024-09-02T14:00:00",
    specialInstructions: "Wear comfortable shoes and bring water",
    // Completion details
    completedDate: "2024-09-02",
    completedTime: "2:00 PM",
    totalVolunteers: 25,
    totalFamiliesServed: 150,
    totalFoodDistributed: "5,000 lbs",
    recipientOrganizations: ["Local Shelter", "Community Center"],
    impact: "150 families received food assistance"
  },
  {
    id: "8",
    title: "School Weekend Meal Program",
    description: "Pre-packed weekend meals for school children from low-income families.",
    organizer: {
      id: "org2",
      name: "Helping Hands Volunteers",
      rating: 4.7,
      campaignsOrganized: 15,
      avatar: "",
      verified: true,
      joinedSince: "Member since 2023",
      type: "restaurant"
    },
    category: "Cooked Meals",
    foodCategory: "cooked-meals",
    date: "2024-09-04",
    time: "11:00",
    dateTime: "Wednesday, Sept 4, 11:00 AM",
    duration: "2 hours",
    estimatedDuration: "2-3 hours",
    locationName: "Roosevelt Elementary School",
    address: "456 School Street, East District",
    distance: "2.5 km",
    totalSpots: 200,
    maxVolunteers: 200,
    reservedSpots: 200,
    remainingSpots: 0,
    image: "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    images: [
      "https://images.unsplash.com/photo-1623745728440-1aa0b9123697?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBicmVhZHxlbnwxfHx8fDE3NTczMjY1NjR8MA&ixlib=rb-4.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    location: {
      address: "Roosevelt Elementary School, 456 School Street",
      distance: "2.5 km",
      coordinates: { lat: 40.7589, lng: -73.9851 }
    },
    timing: {
      date: "Wednesday, Sept 4",
      startTime: "11:00 AM",
      endTime: "1:00 PM",
      duration: "2 hours",
      postedTime: "Posted 2 weeks ago",
      timeOption: "completed"
    },
    pickupInstructions: "For registered families only. Present ID at the school cafeteria.",
    impactGoals: {
      familiesServed: "200+ children",
      foodDistributed: "400 meal packages",
      communityImpact: "Supporting childhood nutrition in East District"
    },
    status: "completed",
    urgent: false,
    dietaryNeeds: ["vegetarian", "halal"],
    ratings: [],
    averageRating: 4.7,
    totalRatings: 15,
    volunteers: ["user4", "user5", "user6"],
    createdBy: "org2",
    createdAt: "2024-08-28T09:00:00",
    updatedAt: "2024-09-04T13:00:00",
    specialInstructions: "Please arrive 15 minutes early for briefing",
    // Completion details
    completedDate: "2024-09-04",
    completedTime: "1:00 PM",
    totalVolunteers: 18,
    totalFamiliesServed: 200,
    totalFoodDistributed: "400 meal packages",
    recipientOrganizations: ["Roosevelt Elementary School"],
    impact: "200 children received weekend meals"
  },
  {
    id: "9",
    title: "Holiday Food Drive",
    description: "Special holiday food distribution with festive meals and groceries for families.",
    organizer: {
      id: "org3",
      name: "Seasonal Helpers",
      rating: 4.8,
      campaignsOrganized: 8,
      avatar: "",
      verified: true,
      joinedSince: "Member since 2023",
      type: "non-profit"
    },
    category: "Mixed Items",
    foodCategory: "mixed",
    date: "2024-08-30",
    time: "9:00",
    dateTime: "Friday, Aug 30, 9:00 AM",
    duration: "6 hours",
    estimatedDuration: "6+ hours",
    locationName: "Downtown Plaza",
    address: "789 Main Street, City Center",
    distance: "1.8 km",
    totalSpots: 100,
    maxVolunteers: 100,
    reservedSpots: 100,
    remainingSpots: 0,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXQlMjB2b2x1bnRlZXJ8ZW58MXx8fHwxNzU3MzE1Nzc3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXQlMjB2b2x1bnRlZXJ8ZW58MXx8fHwxNzU3MzE1Nzc3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    ],
    location: {
      address: "Downtown Plaza, 789 Main Street",
      distance: "1.8 km",
      coordinates: { lat: 40.7505, lng: -73.9934 }
    },
    timing: {
      date: "Friday, Aug 30",
      startTime: "9:00 AM",
      endTime: "3:00 PM",
      duration: "6 hours",
      postedTime: "Posted 3 weeks ago",
      timeOption: "completed"
    },
    pickupInstructions: "Drive-through service available. Stay in your vehicle.",
    impactGoals: {
      familiesServed: "300+ families",
      foodDistributed: "8,000 lbs of food",
      communityImpact: "Providing holiday meals to those in need"
    },
    status: "completed",
    urgent: false,
    dietaryNeeds: ["vegetarian", "halal", "allergen-free"],
    ratings: [
      {
        userId: "user7",
        rating: 5,
        comment: "Amazing event! Very well organized.",
        createdAt: "2024-09-01"
      }
    ],
    averageRating: 4.8,
    totalRatings: 8,
    volunteers: ["user7", "user8", "user9"],
    createdBy: "org3",
    createdAt: "2024-08-20T10:00:00",
    updatedAt: "2024-08-30T15:00:00",
    specialInstructions: "Wear festive attire!",
    // Completion details
    completedDate: "2024-08-30",
    completedTime: "3:00 PM",
    totalVolunteers: 35,
    totalFamiliesServed: 320,
    totalFoodDistributed: "8,500 lbs",
    recipientOrganizations: ["Multiple community organizations"],
    impact: "320 families received holiday food packages"
  }
];

// Dietary needs and tags
export const dietaryNeeds = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher', 'Allergen-Free'];
export const suggestedTags = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Organic', 'Local'];