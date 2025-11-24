// Updated SettingsScreen component
import { useState} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  CheckCircle2,
  AlertCircle,
  Settings,
  Building2,
  Edit3,
  Save,
  X
} from "lucide-react";
import { type UserData, updateUserProfile } from "../../Firebase/auth";
import { getRoleBackgroundColor} from "../auth/Rolebased";

interface SettingsScreenProps {
  userData: UserData;
  onBack: () => void;
  onProfileUpdate: () => void;
}

export function SettingsScreen({ userData, onBack, onProfileUpdate }: SettingsScreenProps) {
  const { role, profile, email, verification } = userData;
  
  // Form state - initialize with actual user data
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    contactPerson: profile?.contactPerson || '',
    orgName: profile?.orgName || '',
    phone: profile?.phone || '',
    street: profile?.address?.street || '',
    city: profile?.address?.city || '',
    postalCode: profile?.address?.postalCode || ''
  });
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  // Get display name based on role
  const getDisplayName = () => {
    if (role === 'receiver') {
      return profile?.name || email || 'User';
    }
    return profile?.orgName || profile?.contactPerson || email || 'Organization';
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Prepare profile data for update
      const profileUpdate: any = {
        phone: formData.phone
      };

      // Role-specific fields
      if (role === 'receiver') {
        profileUpdate.name = formData.name;
      } else {
        if (formData.contactPerson) profileUpdate.contactPerson = formData.contactPerson;
        if (formData.orgName) profileUpdate.orgName = formData.orgName;
      }

      // Address fields (if provided)
      if (formData.street && formData.city && formData.postalCode) {
        profileUpdate.address = {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode
        };
      }

      const result = await updateUserProfile(profileUpdate);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        onProfileUpdate(); // Refresh parent data
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original data
    setFormData({
      name: profile?.name || '',
      contactPerson: profile?.contactPerson || '',
      orgName: profile?.orgName || '',
      phone: profile?.phone || '',
      street: profile?.address?.street || '',
      city: profile?.address?.city || '',
      postalCode: profile?.address?.postalCode || ''
    });
    setIsEditing(false);
    setMessage(null);
  };

  const displayName = getDisplayName();

  return (
    <div className={`${getRoleBackgroundColor(role)} min-h-screen pb-20`}>
      {/* Header */}
      <div className="overflow-hidden">
        <div className='bg-gradient-to-br from-[#6b7280] to-[#4b5563]  px-4 sm:px-6 pt-6 pb-8 flex items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg'>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onBack}
                className="text-white hover:!bg-white/20 p-2 sm:p-3 rounded-xl"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>

              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
                <p className="text-white text-sm sm:text-base">{displayName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 sm:-mt-8 space-y-4 sm:space-y-6 pt-6">
        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-2xl border-l-4 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-500' 
              : 'bg-red-50 text-red-800 border-red-500'
          } shadow-sm`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
              )}
              <span className="font-medium text-sm">{message.text}</span>
            </div>
          </div>
        )}

        {/* Account Settings */}
        <Card className="shadow-lg border-0 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-l-gray-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-700" />
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-700">Account Settings</CardTitle>
              </div>
              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="font-medium text-xs sm:text-sm h-9 bg-gray-200 hover:bg-gray-400 text-gray-700 rounded-xl"
                >
                <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-4">
            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>Email Address</span>
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-11 text-sm bg-gray-100 border-gray-400 rounded-xl pl-11"
                />
              </div>
              <p className="text-xs text-gray-500 pl-1">Email cannot be changed</p>
            </div>

            {/* Role-specific fields */}
            {role === 'receiver' ? (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>Full Name</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={!isEditing}
                    className={`h-11 text-sm rounded-xl pl-11 ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-200"}`}
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span>Organization Name</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="orgName"
                      value={formData.orgName}
                      onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                      disabled={!isEditing}
                      className={`h-11 text-sm rounded-xl pl-11 ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Contact Person</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                      disabled={!isEditing}
                      className={`h-11 text-sm rounded-xl pl-11 ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Phone (Common for all) */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>Phone Number</span>
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  className={`h-11 text-sm rounded-xl pl-11 ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                />
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>Address {role === 'receiver' && '(Optional)'}</span>
              </Label>
              
              <div className="relative">
                <Input
                  placeholder="Street Address"
                  value={formData.street}
                  onChange={(e) => setFormData({...formData, street: e.target.value})}
                  disabled={!isEditing}
                  className={`h-11 text-sm rounded-xl pl-11 ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  disabled={!isEditing}
                  className={`h-11 text-sm rounded-xl ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                />
                <Input
                  placeholder="Postal Code"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  disabled={!isEditing}
                  className={`h-11 text-sm rounded-xl ${isEditing ? "border-blue-300 bg-white" : "bg-gray-100 border-gray-400"}`}
                />
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 font-medium h-12 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 font-medium h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}

            <Separator className="my-4" />

            {/* Verification Status */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  verification?.verified 
                    ? 'bg-green-100 text-green-600' 
                    : verification?.documentUploaded 
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">Verification Status</span>
                  <p className="text-xs text-gray-500">
                    {verification?.verified 
                      ? 'Account verified' 
                      : verification?.documentUploaded 
                      ? 'Under review'
                      : 'Not submitted'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {verification?.verified ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs font-medium px-3 py-1 rounded-full">
                    Verified
                  </Badge>
                ) : verification?.documentUploaded ? (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs font-medium px-3 py-1 rounded-full">
                    Under Review
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs font-medium px-3 py-1 rounded-full">
                    Not Submitted
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}