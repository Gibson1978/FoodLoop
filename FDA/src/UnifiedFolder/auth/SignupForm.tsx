import { useState } from "react";
import { Button } from "../../UnifiedFolder/ui/button";
import { Input } from "../../UnifiedFolder/ui/input";
import { Label } from "../../UnifiedFolder/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../UnifiedFolder/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../UnifiedFolder/ui/tabs";
import { Eye, EyeOff, Upload, X, User, Building, HeartHandshake, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { submitUserRegistration, updateUserVerificationDocument } from "../../Firebase/auth";
import type { UserRegistrationData } from "../../Firebase/auth";
import { uploadVerificationDocument } from "../../Firebase/firebase-storage"; 
import NourishNowLogo from "../Images/NourishNowLogo.png";
import { auth } from "../../Firebase/firebase";
import { signOut } from "firebase/auth";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [activeTab, setActiveTab] = useState<"receiver" | "donor" | "volunteer">("receiver");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Form data for each user type
  const [receiverData, setReceiverData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const [donorData, setDonorData] = useState({
    orgName: "",
    orgType: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    contactPerson: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const [volunteerData, setVolunteerData] = useState({
    orgName: "",
    orgType: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    contactPerson: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const validatePasswords = (password: string, confirmPassword: string): boolean => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Validate that a file is selected for donor and volunteer
      if ((activeTab === "donor" || activeTab === "volunteer") && !idFile) {
        setError("Please upload a verification document");
        setLoading(false);
        return;
      }

      // Validate passwords based on active tab
      let isValid = false;
      let formData: UserRegistrationData;

      switch (activeTab) {
        case "receiver":
          isValid = validatePasswords(receiverData.password, receiverData.confirmPassword);
          if (!receiverData.name || !receiverData.email || !receiverData.phone) {
            setError("Please fill in all required fields");
            setLoading(false);
            return;
          }
          formData = {
            email: receiverData.email,
            password: receiverData.password,
            name: receiverData.name,
            phone: receiverData.phone,
            role: "receiver",
          };
          break;
        case "donor":
          isValid = validatePasswords(donorData.password, donorData.confirmPassword);
          if (!donorData.orgName || !donorData.orgType || !donorData.email || !donorData.phone || !donorData.contactPerson) {
            setError("Please fill in all required fields");
            setLoading(false);
            return;
          }
          formData = {
            email: donorData.email,
            password: donorData.password,
            phone: donorData.phone,
            orgName: donorData.orgName,
            orgType: donorData.orgType,
            contactPerson: donorData.contactPerson,
            address: donorData.address || undefined,
            city: donorData.city || undefined,
            postalCode: donorData.postalCode || undefined,
            role: "donor",
          };
          break;
        case "volunteer":
          isValid = validatePasswords(volunteerData.password, volunteerData.confirmPassword);
          if (!volunteerData.orgName || !volunteerData.email || !volunteerData.phone || !volunteerData.contactPerson) {
            setError("Please fill in all required fields");
            setLoading(false);
            return;
          }
          formData = {
            email: volunteerData.email,
            password: volunteerData.password,
            phone: volunteerData.phone,
            orgName: volunteerData.orgName,
            contactPerson: volunteerData.contactPerson,
            address: volunteerData.address || undefined,
            city: volunteerData.city || undefined,
            postalCode: volunteerData.postalCode || undefined,
            role: "volunteer",
          };
          break;
        default:
          setError("Invalid user type");
          setLoading(false);
          return;
      }

      if (!isValid) {
        setLoading(false);
        return;
      }

      console.log('Submitting registration data:', formData);
      
      // Step 1: Create user account first (user stays authenticated)
      const result = await submitUserRegistration(formData);
      
      console.log('Registration result:', result);
      console.log('User authenticated after registration:', !!auth.currentUser);
      
      if (result.success && result.uid) {
        // Step 2: Upload verification document if provided (user is still authenticated)
        if (idFile) {
          try {
            console.log('Uploading verification document for user:', result.uid);
            console.log('User is authenticated:', !!auth.currentUser);
            console.log('Current user UID:', auth.currentUser?.uid);
            
            // Use the upload function - now with authentication
            const documentUrl = await uploadVerificationDocument(idFile, result.uid);
            console.log('Document uploaded successfully, URL:', documentUrl);
            
            // Step 3: Update user document with verification URL
            await updateUserVerificationDocument(result.uid, documentUrl);
            console.log('Verification document uploaded and user record updated');
          } catch (uploadError) {
            console.error('Failed to upload verification document:', uploadError);
            setError('Account created but document upload failed. Please contact support to upload your verification document.');
          }
        } else {
          console.log('No file to upload for receiver');
        }
        
        // Step 4: Now sign out the user
        await signOut(auth);
        console.log('User signed out after registration process');
        
        // Show success message
        setSignupSuccess(true);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      console.error('Unexpected registration error:', err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Basic file validation
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid file type (JPEG, PNG, PDF)');
        return;
      }
      
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setIdFile(file);
      setError("");
    }
  };

  const removeFile = () => {
    setIdFile(null);
  };

  // Organization types for donor and volunteer
  const orgTypes = [
    "Restaurant",
    "Grocery Store",
    "Supermarket",
    "Hotel"
  ];

  // If signup was successful, show pending approval message
  if (signupSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-500 via-blue-600 to-green-600 flex items-center justify-center p-4 safe-area-padding">
        <div className="w-full max-w-[90vw] sm:max-w-[400px] flex flex-col min-h-0">
          
          {/* Logo that scales */}
          <div className="text-center flex-shrink-0 flex items-center justify-center -mb-6 sm:-mb-8 md:-mb-10">
            <div className="mx-auto inline-block">
              <img 
                src={NourishNowLogo}
                alt="NourishNow Logo" 
                className="w-auto h-24 sm:h-32 md:h-40"
              />
            </div>
          </div>

          {/* Success Card */}
          <Card className="mt-[-4rem] sm:mt-[-3rem] md:mt-[-4rem]">
            <CardHeader className="text-center pb-2 pt-4 flex-shrink-0">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">
                Registration Submitted!
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Your account is pending approval
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-4 px-4 text-center">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base font-medium">Awaiting Admin Approval</span>
                </div>
                
                <p className="text-gray-600 text-xs sm:text-sm">
                  Thank you for registering as a {activeTab}. Your account is currently under review 
                  and will be activated once approved by our administration team.
                </p>
                
                <p className="text-xs text-gray-500">
                  You will receive an email notification when your account is approved. 
                  This process typically takes 24-48 hours.
                </p>

                <Button 
                  onClick={onSwitchToLogin}
                  className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold mt-4 sm:mt-6"
                >
                  Return to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-500 via-blue-600 to-green-600 flex items-center justify-center p-4 safe-area-padding">
      <div className="w-full max-w-[90vw] sm:max-w-[400px] flex flex-col min-h-0">
        
        {/* Logo that scales */}
        <div className="text-center flex-shrink-0 flex items-center justify-center -mb-6 sm:-mb-8 md:-mb-10">
          <div className="mx-auto inline-block">
            <img 
              src={NourishNowLogo}
              alt="NourishNow Logo" 
              className="w-auto h-24 sm:h-32 md:h-40"
            />
          </div>
        </div>

        {/* Signup Card */}
        <Card className="mt-[-4rem] sm:mt-[-3rem] md:mt-[-4rem]">
          <CardHeader className="text-center pb-2 pt-4 flex-shrink-0">
            <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-500 to-green-600 bg-clip-text text-transparent">
              Join NourishNow
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              Create your account and start making a difference
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 min-h-0 flex flex-col pb-4 px-4">
            {/* Error Display */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-xs sm:text-sm flex-1">{error}</p>
              </div>
            )}

            {/* Tabs for different user types */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full flex-1 min-h-0 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-3 bg-gray-100 p-1 rounded-lg flex-shrink-0">
                <TabsTrigger 
                  value="receiver" 
                  className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
                >
                  <User className="h-3 w-3" />
                  <span className="hidden xs:inline">Receiver</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="donor" 
                  className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
                >
                  <Building className="h-3 w-3" />
                  <span className="hidden xs:inline">Donor</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="volunteer" 
                  className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
                >
                  <HeartHandshake className="h-3 w-3" />
                  <span className="hidden xs:inline">Volunteer</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-auto">
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                  {/* Form content container */}
                  <div className="flex-1 min-h-0 overflow-auto space-y-3 sm:space-y-4">
                    {/* Receiver Form */}
                    <TabsContent value="receiver" className="space-y-3 sm:space-y-4 m-0">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="receiver-name" className="text-xs sm:text-sm font-medium text-gray-700">Full Name</Label>
                          <Input
                            id="receiver-name"
                            type="text"
                            placeholder="John Doe"
                            value={receiverData.name}
                            onChange={(e) => setReceiverData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="receiver-phone" className="text-xs sm:text-sm font-medium text-gray-700">Phone Number</Label>
                          <Input
                            id="receiver-phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={receiverData.phone}
                            onChange={(e) => setReceiverData(prev => ({ ...prev, phone: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="receiver-email" className="text-xs sm:text-sm font-medium text-gray-700">Email Address</Label>
                          <Input
                            id="receiver-email"
                            type="email"
                            placeholder="john@example.com"
                            value={receiverData.email}
                            onChange={(e) => setReceiverData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="receiver-password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
                          <div className="relative">
                            <Input
                              id="receiver-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              value={receiverData.password}
                              onChange={(e) => setReceiverData(prev => ({ ...prev, password: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={loading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="receiver-confirmPassword" className="text-xs sm:text-sm font-medium text-gray-700">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="receiver-confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={receiverData.confirmPassword}
                              onChange={(e) => setReceiverData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={loading}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Donor Form */}
                    <TabsContent value="donor" className="space-y-3 sm:space-y-4 m-0">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-orgName" className="text-xs sm:text-sm font-medium text-gray-700">Organization Name</Label>
                          <Input
                            id="donor-orgName"
                            type="text"
                            placeholder="Green Garden Market"
                            value={donorData.orgName}
                            onChange={(e) => setDonorData(prev => ({ ...prev, orgName: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-orgType" className="text-xs sm:text-sm font-medium text-gray-700">Organization Type</Label>
                          <select
                            id="donor-orgType"
                            value={donorData.orgType}
                            onChange={(e) => setDonorData(prev => ({ ...prev, orgType: e.target.value }))}
                            className="w-full h-10 sm:h-12 px-3 sm:px-4 border border-gray-300 rounded-lg sm:rounded-xl bg-white focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base transition-all duration-200"
                            required
                            disabled={loading}
                          >
                            <option value="">Select type</option>
                            {orgTypes.map(type => (
                              <option key={type} value={type.toLowerCase()}>{type}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-contactPerson" className="text-xs sm:text-sm font-medium text-gray-700">Contact Person</Label>
                          <Input
                            id="donor-contactPerson"
                            type="text"
                            placeholder="Sarah Johnson"
                            value={donorData.contactPerson}
                            onChange={(e) => setDonorData(prev => ({ ...prev, contactPerson: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-phone" className="text-xs sm:text-sm font-medium text-gray-700">Phone Number</Label>
                          <Input
                            id="donor-phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={donorData.phone}
                            onChange={(e) => setDonorData(prev => ({ ...prev, phone: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-email" className="text-xs sm:text-sm font-medium text-gray-700">Email Address</Label>
                          <Input
                            id="donor-email"
                            type="email"
                            placeholder="contact@organization.com"
                            value={donorData.email}
                            onChange={(e) => setDonorData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-address" className="text-xs sm:text-sm font-medium text-gray-700">Address</Label>
                          <Input
                            id="donor-address"
                            type="text"
                            placeholder="123 Main Street"
                            value={donorData.address}
                            onChange={(e) => setDonorData(prev => ({ ...prev, address: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="space-y-1 sm:space-y-2">
                            <Label htmlFor="donor-city" className="text-xs sm:text-sm font-medium text-gray-700">City</Label>
                            <Input
                              id="donor-city"
                              type="text"
                              placeholder="New York"
                              value={donorData.city}
                              onChange={(e) => setDonorData(prev => ({ ...prev, city: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                            />
                          </div>
                          
                          <div className="space-y-1 sm:space-y-2">
                            <Label htmlFor="donor-postalCode" className="text-xs sm:text-sm font-medium text-gray-700">Postal Code</Label>
                            <Input
                              id="donor-postalCode"
                              type="text"
                              placeholder="10001"
                              value={donorData.postalCode}
                              onChange={(e) => setDonorData(prev => ({ ...prev, postalCode: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
                          <div className="relative">
                            <Input
                              id="donor-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              value={donorData.password}
                              onChange={(e) => setDonorData(prev => ({ ...prev, password: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={loading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="donor-confirmPassword" className="text-xs sm:text-sm font-medium text-gray-700">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="donor-confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={donorData.confirmPassword}
                              onChange={(e) => setDonorData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={loading}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Volunteer Form */}
                    <TabsContent value="volunteer" className="space-y-3 sm:space-y-4 m-0">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-orgName" className="text-xs sm:text-sm font-medium text-gray-700">Organization Name</Label>
                          <Input
                            id="volunteer-orgName"
                            type="text"
                            placeholder="Helping Hands Volunteers"
                            value={volunteerData.orgName}
                            onChange={(e) => setVolunteerData(prev => ({ ...prev, orgName: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-contactPerson" className="text-xs sm:text-sm font-medium text-gray-700">Contact Person</Label>
                          <Input
                            id="volunteer-contactPerson"
                            type="text"
                            placeholder="Sarah Johnson"
                            value={volunteerData.contactPerson}
                            onChange={(e) => setVolunteerData(prev => ({ ...prev, contactPerson: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-phone" className="text-xs sm:text-sm font-medium text-gray-700">Phone Number</Label>
                          <Input
                            id="volunteer-phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={volunteerData.phone}
                            onChange={(e) => setVolunteerData(prev => ({ ...prev, phone: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-email" className="text-xs sm:text-sm font-medium text-gray-700">Email Address</Label>
                          <Input
                            id="volunteer-email"
                            type="email"
                            placeholder="contact@organization.com"
                            value={volunteerData.email}
                            onChange={(e) => setVolunteerData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-address" className="text-xs sm:text-sm font-medium text-gray-700">Address</Label>
                          <Input
                            id="volunteer-address"
                            type="text"
                            placeholder="123 Main Street"
                            value={volunteerData.address}
                            onChange={(e) => setVolunteerData(prev => ({ ...prev, address: e.target.value }))}
                            required
                            disabled={loading}
                            className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="space-y-1 sm:space-y-2">
                            <Label htmlFor="volunteer-city" className="text-xs sm:text-sm font-medium text-gray-700">City</Label>
                            <Input
                              id="volunteer-city"
                              type="text"
                              placeholder="New York"
                              value={volunteerData.city}
                              onChange={(e) => setVolunteerData(prev => ({ ...prev, city: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                            />
                          </div>
                          
                          <div className="space-y-1 sm:space-y-2">
                            <Label htmlFor="volunteer-postalCode" className="text-xs sm:text-sm font-medium text-gray-700">Postal Code</Label>
                            <Input
                              id="volunteer-postalCode"
                              type="text"
                              placeholder="10001"
                              value={volunteerData.postalCode}
                              onChange={(e) => setVolunteerData(prev => ({ ...prev, postalCode: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
                          <div className="relative">
                            <Input
                              id="volunteer-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              value={volunteerData.password}
                              onChange={(e) => setVolunteerData(prev => ({ ...prev, password: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={loading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-2">
                          <Label htmlFor="volunteer-confirmPassword" className="text-xs sm:text-sm font-medium text-gray-700">Confirm Password</Label>
                          <div className="relative">
                            <Input
                              id="volunteer-confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              value={volunteerData.confirmPassword}
                              onChange={(e) => setVolunteerData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              required
                              disabled={loading}
                              className="h-10 sm:h-12 text-sm sm:text-base rounded-lg sm:rounded-xl border-gray-300 focus:border-blue-500 px-3 sm:px-4 pr-10 sm:pr-12"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 sm:right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 text-gray-500 rounded"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={loading}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>

                  {/* Bottom section with file upload and submit button */}
                  <div className="flex-shrink-0 space-y-3 sm:space-y-4 mt-4">
                    {/* ID Verification Section (Common for all) */}
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="id-upload" className="text-xs sm:text-sm font-medium text-gray-700">
                          Identity Verification Document
                          {(activeTab === "donor" || activeTab === "volunteer") && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        <div className="relative">
                          <input
                            id="id-upload"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            required={activeTab === "donor" || activeTab === "volunteer"}
                            disabled={loading}
                          />
                          <Label
                            htmlFor="id-upload"
                            className={`flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl cursor-pointer transition-colors ${
                              loading ? 'opacity-50 cursor-not-allowed hover:bg-white' : 'hover:bg-blue-50'
                            } bg-white`}
                          >
                            <div className="text-center">
                              <Upload className="mx-auto h-4 w-4 sm:h-6 sm:w-6 text-gray-400 mb-1 sm:mb-2" />
                              <p className="text-xs sm:text-sm font-medium text-gray-700">
                                {activeTab === "receiver" 
                                  ? "Upload verification document (Optional)" 
                                  : "Upload verification document (Required)"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {activeTab === "receiver" 
                                  ? "Government ID or passport" 
                                  : "Business license or organization certificate"}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Max size: 10MB • JPEG, PNG, PDF</p>
                            </div>
                          </Label>
                          {idFile && (
                            <div className="mt-2 flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                              <span className="text-xs sm:text-sm font-medium text-green-800 truncate flex-1">{idFile.name}</span>
                              <span className="text-xs text-green-600 mx-2">
                                ({(idFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-green-100 text-green-600"
                                disabled={loading}
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit"
                      className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Creating Account...
                        </div>
                      ) : (
                        `Create ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Account`
                      )}
                    </Button>

                    {/* Switch to Login */}
                    <div className="text-center pt-2 sm:pt-3 border-t border-gray-200">
                      <p className="text-gray-600 text-xs sm:text-sm">
                        Already have an account?{" "}
                        <Button
                          variant="link"
                          onClick={onSwitchToLogin}
                          className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs sm:text-sm font-semibold hover:underline"
                          disabled={loading}
                        >
                          Sign in here
                        </Button>
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-3 sm:mt-4 flex-shrink-0">
          <p className="text-blue-100 text-xs sm:text-sm">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-white font-medium">Terms</a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-white font-medium">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
}