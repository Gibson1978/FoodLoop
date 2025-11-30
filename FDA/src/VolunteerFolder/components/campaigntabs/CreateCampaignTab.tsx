import { useState, useRef, useEffect } from 'react';
import { Button } from '../../../UnifiedFolder/ui/button';
import { Input } from '../../../UnifiedFolder/ui/input';
import { Label } from '../../../UnifiedFolder/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../UnifiedFolder/ui/select';
import { Camera, MapPin, Calendar, Users, Plus, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { createCampaign, type CampaignInput } from '../../../Firebase/campaignUsers';
import { AutoExpandingTextarea } from '../../../UnifiedFolder/ui/AutoExpandingTextarea';

interface CreateCampaignTabProps {
  onNavigateToCampaigns?: () => void;
}

export function CreateCampaignTab({ onNavigateToCampaigns }: CreateCampaignTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null); // Added ref for error scrolling

  // Form state - UPDATED: Simplified date structure
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    // UPDATED: Single date with times
    campaignDate: '', // Single date
    startTime: '', // Start time
    endTime: '', // End time
    locationName: '',
    fullAddress: '',
    totalSpots: 0
  });

  const categories = ['Canned Items', 'Packaged Food', 'Mixed Items'];

  // Scroll to top when error occurs
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [error]);

  // Image upload handler (same as UploadFoodTab)
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    
    // Check total images limit
    if (uploadedImages.length + newImages.length > 6) {
      setError('Maximum 6 images allowed');
      return;
    }

    // Mobile-optimized validation
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

  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle spots input specifically to convert to number and prevent leading zeros
  const handleSpotsChange = (value: string) => {
    // Remove any non-digit characters and leading zeros
    const cleanValue = value.replace(/\D/g, '').replace(/^0+/, '');
    const numValue = parseInt(cleanValue) || 0;
    
    setFormData(prev => ({
      ...prev,
      totalSpots: numValue
    }));
  };

  // Handle time input changes with validation
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear time-related errors when user starts typing
    if (error && (error.includes('time') || error.includes('Time'))) {
      setError(null);
    }
  };

  // Mobile-optimized form submission with Firebase integration - UPDATED: Simplified validation
  const handleSubmit = async () => {
    setError(null);
    
    // Validation
    if (!formData.title.trim()) {
      setError('Campaign title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Campaign description is required');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a food category');
      return;
    }
    // UPDATED: Single date validation
    if (!formData.campaignDate) {
      setError('Please select campaign date');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Please select start and end times');
      return;
    }
    if (!formData.locationName.trim()) {
      setError('Location name is required');
      return;
    }
    if (!formData.fullAddress.trim()) {
      setError('Full address is required');
      return;
    }
    if (formData.totalSpots <= 0) {
      setError('Please enter a valid number of spots (minimum 1)');
      return;
    }
    if (uploadedImages.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    // Date validations - UPDATED: Single date
    const today = new Date().toISOString().split('T')[0];
    if (formData.campaignDate < today) {
      setError('Campaign date cannot be in the past');
      return;
    }

    // Time validation - Improved error messages
    if (formData.endTime <= formData.startTime) {
      setError('End time must be after start time');
      return;
    }

    // Additional time validation - ensure reasonable duration
    const [startHour, startMinute] = formData.startTime.split(':').map(Number);
    const [endHour, endMinute] = formData.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes - startTotalMinutes < 30) {
      setError('Campaign duration should be at least 30 minutes');
      return;
    }

    if (endTotalMinutes - startTotalMinutes > 12 * 60) {
      setError('Campaign duration cannot exceed 12 hours');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting campaign creation...');

      // Prepare campaign data for Firebase - UPDATED: Simplified date structure
      const campaignData: CampaignInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: selectedCategory,
        // UPDATED: Single date with times
        campaignDate: formData.campaignDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        locationName: formData.locationName.trim(),
        fullAddress: formData.fullAddress.trim(),
        totalSpots: formData.totalSpots,
      };

      console.log('Campaign data prepared:', campaignData);
      console.log('Uploading images:', uploadedImages.length);

      // Call the actual Firebase createCampaign function
      const result = await createCampaign(campaignData, uploadedImages);

      if (result.success) {
        console.log('Campaign created successfully:', result.campaignId);
        setIsSubmitted(true);
        
        // Reset form after successful submission
        setFormData({
          title: '',
          description: '',
          category: '',
          // UPDATED: Reset new fields
          campaignDate: '',
          startTime: '',
          endTime: '',
          locationName: '',
          fullAddress: '',
          totalSpots: 0
        });
        setSelectedCategory('');
        setUploadedImages([]);
        setImagePreviews([]);
        
      } else {
        throw new Error(result.error || 'Failed to create campaign');
      }

    } catch (err: any) {
      console.error('Campaign creation error:', err);
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Campaign Created!</h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Your campaign has been submitted and is pending admin approval.
            You'll be notified once it's approved and visible to receivers.
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              ⏳ Currently under review - Thank you for organizing this food distribution!
            </p>
          </div>
          <Button 
            onClick={() => setIsSubmitted(false)}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold shadow-lg transition-all duration-200"
          >
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-4 sm:px-6 pt-6 pb-8 flex flex-row items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg text-white">   
          <div className="items-center">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 mb-2 sm:mb-4" />
          </div>
          <div className="pl-4 sm:pl-5">
            <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Create Campaign</h1>
            <p className="text-xs sm:text-sm text-green-100">Organize a food distribution event for your community</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-3 sm:p-4 pb-20"> 
        {/* Enhanced Error Display with ref for scrolling */}
        {error && (
          <div ref={errorRef} className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Photo Upload */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-green-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="font-semibold text-green-900 text-sm sm:text-base">Campaign Photos *</h3>
            </div>
            <p className="text-green-700 text-xs sm:text-sm mb-3 sm:mb-4">
              Add photos to showcase your campaign (max 6 images, 5MB each)
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Image preview grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {imagePreviews.map((image, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={image}
                        alt={`Campaign preview ${index + 1}`}
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
                      : 'border-green-300 bg-white/50 cursor-pointer hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  <Camera className={`h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 ${
                    isSubmitting ? 'text-gray-400' : 'text-green-500'
                  }`} />
                  <span className={`text-xs sm:text-sm font-medium text-center ${
                    isSubmitting ? 'text-gray-500' : 'text-green-600'
                  }`}>
                    {isSubmitting ? 'Upload in progress...' : 'Add Photos'}
                  </span>
                  <span className={`text-[10px] sm:text-xs text-center ${
                    isSubmitting ? 'text-gray-400' : 'text-green-500'
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
                <p className="text-[10px] sm:text-xs text-green-600 text-center">
                  {imagePreviews.length} / 6 photos selected • Max 5MB per image
                </p>
              )}
            </div>
          </div>

          {/* Campaign Details */}
          <div className="bg-green-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-green-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="font-semibold text-green-900 text-sm sm:text-base">Campaign Details</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="title" className="text-gray-700 text-xs sm:text-sm">Campaign Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Community Food Distribution, Ramadan Food Drive"
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="description" className="text-gray-700 text-xs sm:text-sm">Description *</Label>
                <AutoExpandingTextarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your campaign, what food will be distributed, who it's for, any special instructions..."
                  className="rounded-lg sm:rounded-xl resize-none border-gray-200 focus:border-green-400 text-xs sm:text-sm"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="category" className="text-gray-700 text-xs sm:text-sm">Food Category *</Label>
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

              {/* Total Spots - FIXED: No leading zeros */}
              <div className="space-y-2">
                <Label className="text-gray-700 text-xs sm:text-sm">Available Spots *</Label>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <Input
                    id="totalSpots"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    value={formData.totalSpots === 0 ? '' : formData.totalSpots}
                    onChange={(e) => handleSpotsChange(e.target.value)}
                    placeholder="e.g., 50"
                    className="rounded-lg sm:rounded-xl border-gray-200 focus:border-green-400 h-9 sm:h-10 text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span>Maximum receivers that can register: {formData.totalSpots || 0} people</span>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time - UPDATED: Single date with times - FIXED: Time validation */}
          <div className="bg-orange-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-orange-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900 text-sm sm:text-base">Date & Time *</h3>
            </div>
            <p className="text-orange-700 text-xs sm:text-sm mb-3 sm:mb-4">
              When will your campaign take place?
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Single Date - UPDATED */}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="campaignDate" className="text-gray-700 text-xs sm:text-sm">Campaign Date *</Label>
                <Input
                  id="campaignDate"
                  type="date"
                  value={formData.campaignDate}
                  onChange={(e) => handleInputChange('campaignDate', e.target.value)}
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-orange-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time Range - FIXED: Better time handling */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-gray-700 text-xs sm:text-sm">Campaign Hours *</Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="startTime" className="text-[10px] sm:text-xs text-gray-500">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleTimeChange('startTime', e.target.value)}
                      className="rounded-lg sm:rounded-xl border-gray-200 focus:border-orange-400 h-9 sm:h-10 text-xs sm:text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endTime" className="text-[10px] sm:text-xs text-gray-500">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleTimeChange('endTime', e.target.value)}
                      className="rounded-lg sm:rounded-xl border-gray-200 focus:border-orange-400 h-9 sm:h-10 text-xs sm:text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
                  Receivers can come during these hours on the selected date. Duration should be 30 minutes to 12 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-purple-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900 text-sm sm:text-base">Location *</h3>
            </div>
            <p className="text-purple-700 text-xs sm:text-sm mb-3 sm:mb-4">
              Where will the campaign take place?
            </p>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="locationName" className="text-gray-700 text-xs sm:text-sm">Location Name</Label>
                <Input
                  id="locationName"
                  value={formData.locationName}
                  onChange={(e) => handleInputChange('locationName', e.target.value)}
                  placeholder="e.g., Community Center, Masjid Jamek, School Hall"
                  className="rounded-lg sm:rounded-xl border-gray-200 focus:border-purple-400 h-9 sm:h-10 text-xs sm:text-sm"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="fullAddress" className="text-gray-700 text-xs sm:text-sm">Full Address</Label>
                <AutoExpandingTextarea
                  id="fullAddress"
                  value={formData.fullAddress}
                  onChange={(e) => handleInputChange('fullAddress', e.target.value)}
                  placeholder="Full street address, city, and postcode"
                  className="rounded-lg sm:rounded-xl resize-none border-gray-200 focus:border-purple-400 text-xs sm:text-sm"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pb-4 sm:pb-8">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 h-10 sm:h-12 text-sm sm:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                  Creating Campaign...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
            <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-2 sm:mt-3">
              By creating a campaign, you agree to our community guidelines and ensure all distributed food meets safety standards.
              All campaigns require admin approval before being visible to receivers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}