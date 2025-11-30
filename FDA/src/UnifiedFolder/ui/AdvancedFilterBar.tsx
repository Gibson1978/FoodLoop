import { useState } from "react";
import { ImageWithFallback } from "../Images/ImageWithFallback";
import { Slider } from "../../UnifiedFolder/ui/slider";
import { Button } from "../../UnifiedFolder/ui/button";
import { 
  ChevronDown, 
  ChevronUp,
  Apple,
  Package,
  UtensilsCrossed,
  Building2,
  Hotel,
  ShoppingCart,
  Store,
  Star,
  Leaf,
  Cross,
  Bookmark,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterOptions {
  foodTypes: string[];
  distance: number;
  donorTypes: string[];
  timeOptions: string[];
  rating: number;
  dietaryNeeds: string[];
  reserved: 'all' | 'my' | 'available' | 'completed' | null;
  quantity: number;
}

interface AdvancedFilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  variant?: "receiver" | "volunteer";
}

// Updated food types based on FoodListing category
const foodTypeCategories = [
  { 
    id: "Fresh Produce", 
    label: "Fresh Produce", 
    icon: Apple,
    image: "https://images.unsplash.com/photo-1751210769268-85d43ecfcdd8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHZlZ2V0YWJsZXMlMjBwcm9kdWNlfGVufDF8fHx8MTc2MTE4NzM0OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  { 
    id: "Shelf Stable", 
    label: "Shelf Stable", 
    icon: Package,
    image: "https://images.unsplash.com/photo-1633839043868-4bc3724e6e1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmVhZCUyMHNoZWxmJTIwc3RhYmxlfGVufDF8fHx8MTc2MTIxNDMzNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  { 
    id: "Cooked Meals", 
    label: "Cooked Meals", 
    icon: UtensilsCrossed,
    image: "https://images.unsplash.com/photo-1760637625739-a4be05a26cb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29rZWQlMjBtZWFsJTIwZGlzaHxlbnwxfHx8fDE3NjEyMTQzMzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
];

// Donor types based on FoodListing donor info
const donorTypeCategories = [
  { 
    id: "restaurant", 
    label: "Restaurant", 
    icon: UtensilsCrossed,
    image: "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbnxlbnwxfHx8fDE3NjExNDY0NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  { 
    id: "hotel", 
    label: "Hotel", 
    icon: Hotel,
    image: "https://images.unsplash.com/photo-1667125094717-47e0ff6d0608?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3RlbCUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2MTE5MTUxN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  { 
    id: "supermarket", 
    label: "Supermarket", 
    icon: ShoppingCart,
    image: "https://images.unsplash.com/photo-1571340910399-354d2ce7f1dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXBlcm1hcmtldCUyMGdyb2Nlcnl8ZW58MXx8fHwxNzYxMTY5ODA3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  { 
    id: "grocery", 
    label: "Grocery Store", 
    icon: Store,
    image: "https://images.unsplash.com/photo-1571340910399-354d2ce7f1dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXBlcm1hcmtldCUyMGdyb2Nlcnl8ZW58MXx8fHwxNzYxMTY5ODA3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
];

// Dietary needs based on FoodListing tags
const dietaryNeedCategories = [
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "halal", label: "Halal", icon: Cross },
  { id: "allergen-free", label: "Allergen Free", icon: Cross },
  { id: "gluten-free", label: "Gluten Free", icon: Cross },
  { id: "dairy-free", label: "Dairy Free", icon: Cross },
  { id: "vegan", label: "Vegan", icon: Leaf },
];

// Quantity options based on FoodListing remainingQuantity
const quantityOptions = [
  { id: "small", label: "Small (< 50)", min: 1, max: 50 },
  { id: "medium", label: "Medium (50-100)", min: 50, max: 100 },
  { id: "large", label: "Large (100+)", min: 100, max: 1000 },
];

const mainFilters = [
  { id: "food-type", label: "Food Type", icon: Apple },
  { id: "distance", label: "Distance", icon: MapPin },
  { id: "donor-type", label: "Donor Type", icon: Building2 },
  { id: "rating", label: "Rating", icon: Star },
  { id: "dietary", label: "Dietary", icon: Leaf },
  { id: "quantity", label: "Quantity", icon: Package },
  { id: "reserved", label: "Reserved", icon: Bookmark },
];

export function AdvancedFilterBar({ onFilterChange, variant = "receiver" }: AdvancedFilterBarProps) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    foodTypes: [],
    distance: 50,
    donorTypes: [],
    timeOptions: [],
    rating: 0,
    dietaryNeeds: [],
    reserved: null,
    quantity: 0,
  });

  // Color configuration based on variant
  const colors = {
    receiver: {
      primary: "orange",
      bg: "bg-orange-100",
      border: "border-orange-400",
      borderHover: "border-orange-300",
      borderActive: "border-orange-500",
      bgActive: "bg-orange-500",
      text: "text-orange-600",
      textActive: "text-orange-600",
      badge: "bg-orange-500",
    },
    volunteer: {
      primary: "green",
      bg: "bg-green-100",
      border: "border-green-400",
      borderHover: "border-green-300",
      borderActive: "border-green-500",
      bgActive: "bg-green-400",
      text: "text-green-600",
      textActive: "text-green-600",
      badge: "bg-green-500",
    }
  };

  const currentColors = colors[variant];

  const handleFilterClick = (filterId: string) => {
    setExpandedFilter(expandedFilter === filterId ? null : filterId);
  };

  const toggleArrayFilter = (
    key: keyof Pick<FilterOptions, 'foodTypes' | 'donorTypes' | 'timeOptions' | 'dietaryNeeds'>,
    value: string
  ) => {
    const newFilters = { ...filters };
    const currentArray = newFilters[key] as string[];
    
    if (currentArray.includes(value)) {
      newFilters[key] = currentArray.filter(item => item !== value) as any;
    } else {
      newFilters[key] = [...currentArray, value] as any;
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDistanceChange = (value: number[]) => {
    const newFilters = { ...filters, distance: value[0] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleRatingClick = (rating: number) => {
    const newFilters = { ...filters, rating: filters.rating === rating ? 0 : rating };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleQuantityClick = (quantityLevel: number) => {
    const newFilters = { ...filters, quantity: filters.quantity === quantityLevel ? 0 : quantityLevel };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReservedToggle = () => {
    const newFilters = { ...filters };
    
    // Cycle through states: null -> 'my' -> 'available' -> 'completed' -> null
    if (newFilters.reserved === null) {
      newFilters.reserved = 'my';
    } else if (newFilters.reserved === 'my') {
      newFilters.reserved = 'available';
    } else if (newFilters.reserved === 'available') {
      newFilters.reserved = 'completed';
    } else {
      newFilters.reserved = null;
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const getActiveFilterCount = (filterId: string): number => {
    switch (filterId) {
      case "food-type":
        return filters.foodTypes.length;
      case "donor-type":
        return filters.donorTypes.length;
      case "dietary":
        return filters.dietaryNeeds.length;
      case "rating":
        return filters.rating > 0 ? 1 : 0;
      case "distance":
        return filters.distance < 50 ? 1 : 0;
      case "reserved":
        return filters.reserved !== null ? 1 : 0;
      case "quantity":
        return filters.quantity > 0 ? 1 : 0;
      default:
        return 0;
    }
  };

  // Update getReservedLabel function
  const getReservedLabel = (): string => {
    if (filters.reserved === 'my') return "My Reservations";
    if (filters.reserved === 'available') return "Available";
    if (filters.reserved === 'completed') return "Completed";
    return "Reserved";
  };

  // Update getReservedIconColor function
  const getReservedIconColor = (): string => {
    if (filters.reserved === 'my') return "text-blue-500";
    if (filters.reserved === 'available') return "text-green-500";
    if (filters.reserved === 'completed') return "text-purple-500";
    return "text-muted-foreground";
  };

  const getQuantityLabel = (): string => {
    switch (filters.quantity) {
      case 1: return "Small";
      case 2: return "Medium";
      case 3: return "Large";
      default: return "Quantity";
    }
  };

  return (
    <div className="space-y-2 w-full">
      {/* Main Filter Circles - Fully Mobile Optimized */}
      <div className="flex gap-2 pb-3 px-3 pt-2 overflow-x-auto scrollbar-hide touch-pan-x">
        {mainFilters.map((filter) => {
          const Icon = filter.icon;
          const activeCount = getActiveFilterCount(filter.id);
          const isExpanded = expandedFilter === filter.id;
          
          // Special handling for reserved and quantity filters
          const isReservedFilter = filter.id === "reserved";
          const isQuantityFilter = filter.id === "quantity";
          const reservedIconColor = isReservedFilter ? getReservedIconColor() : '';
          
          return (
            <button
              key={filter.id}
              onClick={() => {
                if (isReservedFilter) {
                  handleReservedToggle();
                } else {
                  handleFilterClick(filter.id);
                }
              }}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 relative min-w-[56px] active:scale-95 transition-transform"
              aria-label={`${filter.label} filter`}
              aria-expanded={isExpanded}
            >
              {/* Filter Circle */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-3 transition-all ${
                isExpanded
                  ? `${currentColors.borderActive} ${currentColors.bgActive} shadow-lg scale-110` 
                  : activeCount > 0
                  ? `${currentColors.border} ${currentColors.bg}`
                  : `${currentColors.border} ${currentColors.bg}`
              } ${isReservedFilter ? reservedIconColor : ''}`}>
                <Icon className={`w-5 h-5 ${
                  isExpanded 
                    ? 'text-white' 
                    : activeCount > 0 
                      ? (isReservedFilter ? reservedIconColor : currentColors.text)
                      : (isReservedFilter ? reservedIconColor : 'text-muted-foreground')
                }`} />
              </div>
              
              {/* Active Count Badge */}
              {activeCount > 0 && (
                <div className={`absolute -top-1 -right-1 w-4 h-4 ${currentColors.badge} rounded-full flex items-center justify-center text-white text-[10px] font-medium`}>
                  {activeCount}
                </div>
              )}
              
              {/* Filter Label */}
              <div className="text-center max-w-[56px]">
                <p className={`text-[11px] transition-colors whitespace-nowrap truncate ${
                  isExpanded || activeCount > 0
                    ? `${isReservedFilter ? reservedIconColor : currentColors.textActive} font-semibold` 
                    : (isReservedFilter ? reservedIconColor : 'text-muted-foreground')
                }`}>
                  {isReservedFilter ? getReservedLabel() : 
                   isQuantityFilter ? getQuantityLabel() : 
                   filter.label}
                </p>
              </div>
              
              {/* Expand/Collapse Icon */}
              {!isReservedFilter && (
                isExpanded ? (
                  <ChevronUp className={`w-3 h-3 ${currentColors.textActive}`} />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable Filter Details - Mobile First */}
      <AnimatePresence>
        {expandedFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-background border border-border rounded-lg p-3 mx-2 shadow-sm">
              
              {/* Food Type Filter */}
              {expandedFilter === "food-type" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-center">Food Types</h3>
                  <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-hide touch-pan-x">
                    {foodTypeCategories.map((category) => {
                      const isSelected = filters.foodTypes.includes(category.id);
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => toggleArrayFilter('foodTypes', category.id)}
                          className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 w-16 active:scale-95 transition-transform"
                        >
                          <div className={`w-14 h-14 rounded-full overflow-hidden border-3 transition-all ${
                            isSelected 
                              ? `${currentColors.border} shadow-md scale-105` 
                              : 'border-gray-200'
                          }`}>
                            <ImageWithFallback
                              src={category.image}
                              alt={category.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className={`text-[11px] text-center font-medium ${isSelected ? `${currentColors.text}` : 'text-gray-600'}`}>
                            {category.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Distance Filter - Updated Range */}
              {expandedFilter === "distance" && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-center">Distance Range</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-gray-600 px-1">
                    <span>5 km</span>
                    <span className={`${currentColors.text} font-semibold`}>
                      {filters.distance === 50 ? 'All' : `${filters.distance} km`}
                    </span>
                    <span>50 km</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[filters.distance]}
                      onValueChange={handleDistanceChange}
                      min={5}
                      max={50}
                      step={5}
                      variant={variant}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {filters.distance === 50 
                      ? 'Showing all distances' 
                      : `Within ${filters.distance} km`
                    }
                  </p>
                </div>
              </div>
            )}

              {/* Donor Type Filter */}
              {expandedFilter === "donor-type" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-center">Donor Types</h3>
                  <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-hide touch-pan-x">
                    {donorTypeCategories.map((category) => {
                      const isSelected = filters.donorTypes.includes(category.id);
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => toggleArrayFilter('donorTypes', category.id)}
                          className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 w-16 active:scale-95 transition-transform"
                        >
                          <div className={`w-14 h-14 rounded-full overflow-hidden border-3 transition-all ${
                            isSelected 
                              ? `${currentColors.border} shadow-md scale-105` 
                              : 'border-gray-200'
                          }`}>
                            <ImageWithFallback
                              src={category.image}
                              alt={category.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className={`text-[11px] text-center font-medium ${isSelected ? `${currentColors.text}` : 'text-gray-600'}`}>
                            {category.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rating Filter */}
              {expandedFilter === "rating" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-center">Minimum Rating</h3>
                  <div className="flex gap-1 justify-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        className="active:scale-95 transition-transform"
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= filters.rating 
                              ? 'fill-yellow-500 text-yellow-500' 
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {filters.rating > 0 
                      ? `${filters.rating}+ stars` 
                      : 'Any rating'}
                  </p>
                </div>
              )}

              {/* Dietary Needs Filter */}
              {expandedFilter === "dietary" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-center">Dietary Needs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {dietaryNeedCategories.map((category) => {
                      const Icon = category.icon;
                      const isSelected = filters.dietaryNeeds.includes(category.id);
                      
                      return (
                        <Button
                          key={category.id}
                          onClick={() => toggleArrayFilter('dietaryNeeds', category.id)}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`text-xs h-9 justify-start ${
                            isSelected 
                              ? `${currentColors.bgActive} text-white border-transparent` 
                              : 'border-gray-200'
                          }`}
                        >
                          <Icon className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate">{category.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Filter */}
              {expandedFilter === "quantity" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-center">Quantity Available</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {quantityOptions.map((option, index) => {
                      const level = index + 1;
                      const isSelected = filters.quantity === level;
                      
                      return (
                        <Button
                          key={option.id}
                          onClick={() => handleQuantityClick(level)}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`text-xs h-9 justify-start ${
                            isSelected 
                              ? `${currentColors.bgActive} text-white border-transparent` 
                              : 'border-gray-200'
                          }`}
                        >
                          <Package className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate">{option.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear Filter Button */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const clearedFilters: FilterOptions = {
                      foodTypes: [],
                      distance: 10,
                      donorTypes: [],
                      timeOptions: [],
                      rating: 0,
                      dietaryNeeds: [],
                      reserved: null,
                      quantity: 0,
                    };
                    setFilters(clearedFilters);
                    onFilterChange(clearedFilters);
                    setExpandedFilter(null);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 border border-gray-200 h-8 px-3"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}