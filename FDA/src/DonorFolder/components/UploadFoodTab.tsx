import { useState, useRef } from 'react';
import { Button } from '../../UnifiedFolder/ui/button';
import { Input } from '../../UnifiedFolder/ui/input';
import { Label } from '../../UnifiedFolder/ui/label';
import { Textarea } from '../../UnifiedFolder/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../UnifiedFolder/ui/select';
import { Badge } from '../../UnifiedFolder/ui/badge';
import { Camera, MapPin, Package, Plus, X, CheckCircle, Upload, Info, AlertCircle } from 'lucide-react';
import { uploadFoodListing } from '../../Firebase/foodUsers';
import { auth } from '../../Firebase/firebase';

interface UploadFoodTabProps {
  onNavigateToListings: () => void;
}

export function UploadFoodTab({ onNavigateToListings }: UploadFoodTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - UPDATED: Simplified date structure
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalQuantity: 0,
    quantityUnit: 'servings',
    expiryDate: '',
    pickupAddress: '',
    pickupInstructions: '',
    availableDate: '', // CHANGED: Single date
    startTime: '', // CHANGED: Start time for that date
    endTime: '' // CHANGED: End time for that date
  });

  const categories = ['Fresh Produce', 'Cooked Meals', 'Shelf Stable'];
  const quantityUnits = ['servings', 'kg', 'packages', 'containers', 'liters'];
  const suggestedTags = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Allergen Free', 'Dairy Free'];

  // Image upload handler (unchanged)
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    
    if (uploadedImages.length + newImages.length > 6) {
      setError('Maximum 6 images allowed');
      return;
    }

    const validImages = newImages.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload only JPEG, PNG, or WebP images');
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError(`Image "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });

    if (validImages.length === 0) {
      setError('No valid images selected');
      return;
    }

    setUploadedImages(prev => [...prev, ...validImages]);

    const previewPromises = validImages.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          }
        };
        reader.onerror = () => {
          console.error(`Failed to read image: ${file.name}`);
          resolve('');
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then(previews => {
      const validPreviews = previews.filter(preview => preview !== '');
      setImagePreviews(prev => [...prev, ...validPreviews]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
      setTags([...tags, cleanTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle quantity input specifically to convert to number
  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      totalQuantity: numValue
    }));
  };

  // Mobile-optimized form submission - UPDATED: Simplified validation
  const handleSubmit = async () => {
    setError(null);
    
    // Enhanced mobile-friendly validation
    if (!formData.title.trim()) {
      setError('Food name/description is required');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }
    if (formData.totalQuantity <= 0) {
      setError('Please enter a valid quantity (minimum 1)');
      return;
    }
    if (!formData.expiryDate) {
      setError('Best before date is required');
      return;
    }
    if (!formData.pickupAddress.trim()) {
      setError('Pickup address is required');
      return;
    }
    // UPDATED: Simplified date validation
    if (!formData.availableDate) {
      setError('Please select available date');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Please select pickup hours');
      return;
    }
    if (uploadedImages.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    // Mobile-specific date validations - UPDATED
    const today = new Date().toISOString().split('T')[0];
    if (formData.expiryDate < today) {
      setError('Best before date cannot be in the past');
      return;
    }
    if (formData.availableDate < today) {
      setError('Available date cannot be in the past');
      return;
    }

    // Time validation
    if (formData.endTime <= formData.startTime) {
      setError('End time must be after start time');
      return;
    }

    // Check authentication
    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to upload food. Please log in and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting mobile food upload...');

      // Prepare food data - UPDATED: Simplified date structure
      const foodData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: selectedCategory,
        totalQuantity: formData.totalQuantity,
        quantityUnit: formData.quantityUnit,
        expiryDate: formData.expiryDate,
        tags: tags,
        pickupAddress: formData.pickupAddress.trim(),
        pickupInstructions: formData.pickupInstructions.trim(),
        // UPDATED: Single date with times
        availableDate: formData.availableDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        donorId: user.uid,
        donorName: user.displayName || 'Anonymous Donor',
        donorEmail: user.email || ''
      };

      console.log('Food data prepared:', foodData);
      console.log('Uploading images:', uploadedImages.length);

      // Call the actual upload function
      const result = await uploadFoodListing(foodData, uploadedImages);

      if (result.success) {
        console.log('Food listing uploaded successfully:', result.listingId);
        setIsSubmitted(true);
        
        // Reset form after successful submission
        setFormData({
          title: '',
          description: '',
          totalQuantity: 0,
          quantityUnit: 'servings',
          expiryDate: '',
          pickupAddress: '',
          pickupInstructions: '',
          // UPDATED: Reset new fields
          availableDate: '',
          startTime: '',
          endTime: ''
        });
        setSelectedCategory('');
        setUploadedImages([]);
        setImagePreviews([]);
        setTags([]);
        
      } else {
        throw new Error(result.error || 'Failed to upload food listing');
      }

    } catch (err: any) {
      console.error('Mobile upload error:', err);
      setError(err.message || 'Network error. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-green-50 to-orange-50">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg w-full max-w-md text-center p-6 sm:p-8">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Food Listed Successfully!</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Your food listing has been submitted and is pending admin approval.
            You'll be notified once it's approved and visible to recipients.
          </p>
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-700">
              ⏳ Currently under review - Thank you for helping reduce food waste!
            </p>
          </div>
          <Button 
            onClick={onNavigateToListings}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            View My Listings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
          <div className="items-center">
            <Upload className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-4" />
          </div>
          <div className="pl-4 sm:pl-5">
            <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Share Your Food</h1>
            <p className="text-xs sm:text-sm text-blue-100">Help reduce waste by sharing surplus food with your community</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-3 sm:p-4 pb-20"> 
        {/* Enhanced Error Display */}
        {error && (
          <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Photo Upload Section */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 text-sm sm:text-base">Food Photos *</h3>
            </div>
            <p className="text-blue-700 text-xs sm:text-sm mb-3 sm:mb-4">
              Add photos to help recipients identify your food (max 6 images, 5MB each)
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {imagePreviews.map((image, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={image}
                        alt={`Food preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg sm:rounded-xl border border-gray-200"
                        onError={(e) => {
                          console.error(`Failed to load image preview ${index}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full p-0 opacity-90 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                        disabled={isSubmitting}
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {imagePreviews.length < 6 && (
                <div 
                  onClick={isSubmitting ? undefined : triggerFileInput}
                  className={`w-full aspect-[3/1] border-2 border-dashed rounded-lg sm:rounded-xl flex flex-col items-center justify-center transition-colors p-4 ${
                    isSubmitting 
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                      : 'border-blue-300 bg-white/50 cursor-pointer hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <Camera className={`h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 ${
                    isSubmitting ? 'text-gray-400' : 'text-blue-500'
                  }`} />
                  <span className={`text-xs sm:text-sm font-medium text-center ${
                    isSubmitting ? 'text-gray-500' : 'text-blue-600'
                  }`}>
                    {isSubmitting ? 'Upload in progress...' : 'Add Photos'}
                  </span>
                  <span className={`text-[10px] sm:text-xs text-center ${
                    isSubmitting ? 'text-gray-400' : 'text-blue-500'
                  }`}>
                    {isSubmitting ? 'Please wait' : 'Upload up to 6 photos • Max 5MB each'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg, image/jpg, image/png, image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              {imagePreviews.length > 0 && (
                <p className="text-[10px] sm:text-xs text-blue-600 text-center">
                  {imagePreviews.length} / 6 photos selected • Max 5MB per image
                </p>
              )}
            </div>
          </div>

          {/* Food Details */}
          <div className="bg-green-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-green-200 ">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 ">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="font-semibold text-green-900 text-sm sm:text-base">Food Details</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4 ">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="title" className="text-gray-700 text-xs sm:text-sm">Food Name/Description *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Fresh vegetables, Homemade pasta"
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="category" className="text-gray-700 text-xs sm:text-sm">Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isSubmitting}>
                  <SelectTrigger className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select food category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-xs sm:text-sm">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Section */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-xs sm:text-sm">Quantity *</Label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="col-span-2">
                    <Input
                      id="totalQuantity"
                      type="number"
                      min="1"
                      value={formData.totalQuantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      placeholder="e.g., 5"
                      className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="col-span-1">
                    <Select 
                      value={formData.quantityUnit} 
                      onValueChange={(value) => handleInputChange('quantityUnit', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {quantityUnits.map((unit) => (
                          <SelectItem key={unit} value={unit} className="text-xs sm:text-sm">
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>Total available: {formData.totalQuantity} {formData.quantityUnit}</span>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="expiryDate" className="text-gray-700 text-xs sm:text-sm">Best Before *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="description" className="text-gray-700 text-xs sm:text-sm">Additional Details</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Any special instructions, ingredients, storage requirements..."
                  className="rounded-lg sm:rounded-xl resize-none border-gray-200 focus:border-green-400 text-xs sm:text-sm"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-gray-700 text-xs sm:text-sm">Food Tags (Optional)</Label>
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-green-100 text-green-800 py-1 px-2 text-[10px] sm:text-xs"
                    >
                      {tag}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                        disabled={isSubmitting}
                      >
                        <X className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add custom tag"
                    className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(newTag);
                      }
                    }}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(newTag)}
                    className="rounded-lg sm:rounded-xl border-gray-200 h-9 sm:h-10"
                    disabled={isSubmitting}
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-2 pt-1">
                  {suggestedTags.map((tag) => (
                    <Button
                      key={tag}
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] sm:text-xs text-gray-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => addTag(tag)}
                      disabled={isSubmitting}
                    >
                      + {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Location & Availability - UPDATED: Simplified date structure */}
          <div className="bg-purple-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900 text-sm sm:text-base">Pickup Location & Availability</h3>
            </div>
            <p className="text-purple-700 text-xs sm:text-sm mb-3 sm:mb-4">
              Where and when can recipients collect the food?
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="pickupAddress" className="text-gray-700 text-xs sm:text-sm">Address *</Label>
                <Input
                  id="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
                  placeholder="Enter pickup address"
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="pickupInstructions" className="text-gray-700 text-xs sm:text-sm">Pickup Instructions</Label>
                <Textarea
                  id="pickupInstructions"
                  value={formData.pickupInstructions}
                  onChange={(e) => handleInputChange('pickupInstructions', e.target.value)}
                  placeholder="Any specific instructions for pickup (e.g., ring doorbell, back entrance, available times...)"
                  className="rounded-lg sm:rounded-xl resize-none border-gray-200 focus:border-green-400 text-xs sm:text-sm"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Availability Section - UPDATED: Single date with times */}
              <div className="bg-purple-25 rounded-lg p-3 sm:p-4 border border-purple-100">
                <h4 className="font-medium text-purple-900 text-sm sm:text-base mb-2 sm:mb-3">Availability</h4>
                
                {/* Single Date */}
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <Label htmlFor="availableDate" className="text-gray-700 text-xs sm:text-sm">Available Date *</Label>
                  <Input
                    id="availableDate"
                    type="date"
                    value={formData.availableDate}
                    onChange={(e) => handleInputChange('availableDate', e.target.value)}
                    className="rounded-lg sm:rounded-xl border-gray-200 focus:border-purple-400 h-9 sm:h-10 text-xs sm:text-sm"
                    disabled={isSubmitting}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Time Range */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-gray-700 text-xs sm:text-sm">Pickup Hours *</Label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="startTime" className="text-[10px] sm:text-xs text-gray-500">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className="rounded-lg sm:rounded-xl border-gray-200 focus:border-purple-400 h-9 sm:h-10 text-xs sm:text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endTime" className="text-[10px] sm:text-xs text-gray-500">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className="rounded-lg sm:rounded-xl border-gray-200 focus:border-purple-400 h-9 sm:h-10 text-xs sm:text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
                    Pickups can be scheduled between these hours on the selected date.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pb-4 sm:pb-8">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-10 sm:h-12 text-sm sm:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  List Food for Pickup
                </>
              )}
            </Button>
            <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-2 sm:mt-3">
              By listing your food, you agree to our community guidelines and food safety standards.
              All listings require admin approval before being visible to recipients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}