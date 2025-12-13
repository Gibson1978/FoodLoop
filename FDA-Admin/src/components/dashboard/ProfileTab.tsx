import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { 
  Database,
  Trash2,
  Loader2,
  Shield,
  Users,
  Layers,
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  X,
  MapPin,
  Edit2,
  Home,
  CheckCircle,
  Building2,
  Globe,
  Eye,
  EyeOff
} from "lucide-react";
import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import app from "../../Firebase/Firebase";
import { testDataService, type TestDataConfig } from "../../services/testDataServices";
import { 
  USER_STATUS,
  type UserData,
  subscribeToAdminProfile,
  updateAdminProfile,
  isCurrentUserAdmin
} from "../../Firebase/auth";

// Interface for admin data including address
interface AdminProfileData {
  email: string;
  name: string;
  phone: string;
}

export function ProfileTab() {
  // Test Data State
  const [testDataLoading, setTestDataLoading] = useState(false);
  const [testDataMessage, setTestDataMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [useExistingUsers, setUseExistingUsers] = useState(false);
  const [useSequentialMode, setUseSequentialMode] = useState(false); 
  
  const [testDataConfig, setTestDataConfig] = useState<TestDataConfig>({
    usersCount: 50,
    foodListingsCount: 100,
    campaignsCount: 50,
    pastMonths: 6,
    futureDays: 3
  });

  // Admin Profile State
  const [adminProfile, setAdminProfile] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<AdminProfileData>({
    email: "",
    name: "",
    phone: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminListenerUnsubscribe, setAdminListenerUnsubscribe] = useState<(() => void) | null>(null);

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      // Clean up previous listener
      if (adminListenerUnsubscribe) {
        adminListenerUnsubscribe();
        setAdminListenerUnsubscribe(null);
      }

      // Set up new listener if user exists
      if (user) {
        setupAdminProfileListener(user.uid);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }
    });
    
    return () => {
      // Cleanup on component unmount
      if (adminListenerUnsubscribe) {
        adminListenerUnsubscribe();
      }
      unsubscribe();
    };
  }, [auth]);

  // Real-time admin profile listener
  const setupAdminProfileListener = async (uid: string) => {
    setProfileLoading(true);
    
    try {
      // First check if user is admin
      const adminCheck = await isCurrentUserAdmin();
      setIsAdmin(adminCheck);
      
      if (!adminCheck) {
        setProfileError("Admin privileges required to view profile");
        setProfileLoading(false);
        return;
      }

      // Set up real-time listener for admin profile
      const unsubscribe = subscribeToAdminProfile(
        uid,
        (profileData) => {
          if (profileData) {
            setAdminProfile(profileData);
            // Map to AdminProfileData structure
            setEditableProfile({
              email: profileData.email || "",
              name: profileData.profile?.name || "",
              phone: profileData.profile?.phone || "",
            });
          } else {
            setAdminProfile(null);
          }
          setProfileLoading(false);
        },
        (error) => {
          console.error("Error in admin profile listener:", error);
          setProfileError("Failed to load admin profile");
          setProfileLoading(false);
        }
      );

      setAdminListenerUnsubscribe(() => unsubscribe);
    } catch (error: any) {
      console.error("Error setting up admin profile listener:", error);
      setProfileError(error.message || "Failed to load admin profile");
      setProfileLoading(false);
    }
  };

  // Save admin profile
  const handleSaveProfile = async () => {
    if (!currentUser || !adminProfile) return;
    
    setSaveLoading(true);
    setProfileError("");
    
    try {
      // Validate required fields
      if (!editableProfile.name.trim()) {
        throw new Error("Name is required");
      }
      if (!editableProfile.phone.trim()) {
        throw new Error("Phone number is required");
      }

      // Prepare update data matching the AdminSignupData structure + address
      const updateData = {
        profile: {
          name: editableProfile.name.trim(),
          phone: editableProfile.phone.trim(),
        }
      };
      
      const result = await updateAdminProfile(updateData);
      if (result.success) {
        setIsEditing(false);
      } else {
        setProfileError(result.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setProfileError(error.message || "Failed to save profile");
    } finally {
      setSaveLoading(false);
    }
  };

  // ========== Test Data Functions ==========
  const isGeneratingRef = useRef(false);
  
  const generateSequentially = async () => {
    if (!currentUser || isGeneratingRef.current) return;
    
    isGeneratingRef.current = true;
    setTestDataLoading(true);
    setTestDataMessage("🚀 Starting sequential generation (3 steps only)...");
    
    try {
      // Step 1: Generate users
      if (testDataConfig.usersCount > 0 && !useExistingUsers) {
        setTestDataMessage("🔄 Step 1/3: Generating users (this may take time)...");
        const result1 = await testDataService.generateTestData({
          usersCount: testDataConfig.usersCount,
          foodListingsCount: 0,
          campaignsCount: 0,
          pastMonths: testDataConfig.pastMonths,
          futureDays: testDataConfig.futureDays,
          phase: 'users'
        });
        setTestDataMessage(`✅ ${result1.message}\n🔄 Step 2/3: Generating food listings...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else if (useExistingUsers) {
        setTestDataMessage("✅ Using existing users\n🔄 Step 2/3: Generating food listings...");
      }

      // Step 2: Generate food listings
      if (testDataConfig.foodListingsCount > 0) {
        const result2 = await testDataService.generateTestData({
          usersCount: 0,
          foodListingsCount: testDataConfig.foodListingsCount,
          campaignsCount: 0,
          pastMonths: testDataConfig.pastMonths,
          futureDays: testDataConfig.futureDays,
          phase: 'listings'
        });
        setTestDataMessage(`✅ ${result2.message}\n🔄 Step 3/3: Generating campaigns...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Step 3: Generate campaigns
      if (testDataConfig.campaignsCount > 0) {
        const result3 = await testDataService.generateTestData({
          usersCount: 0,
          foodListingsCount: 0,
          campaignsCount: testDataConfig.campaignsCount,
          pastMonths: testDataConfig.pastMonths,
          futureDays: testDataConfig.futureDays,
          phase: 'campaigns'
        });
        setTestDataMessage(`✅ ${result3.message}\n\n🎉 ITEM GENERATION COMPLETE!\n\n👉 Now click "Generate Relationships Only" to create reservations, ratings, and reports.`);
      }
      
    } catch (error: any) {
      setTestDataMessage(`❌ Error at step: ${error.message}`);
    } finally {
      setTestDataLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleGenerateTestData = async () => {
    if (!currentUser) {
      setTestDataMessage("❌ You must be logged in to generate test data");
      return;
    }

    setTestDataLoading(true);
    setTestDataMessage("");
    
    try {
      const config = {
        ...testDataConfig,
        usersCount: useExistingUsers ? 0 : testDataConfig.usersCount
      };
      
      const result = await testDataService.generateTestData(config);
      setTestDataMessage(`✅ ${result.message}\n\n👉 Now click "Generate Relationships Only" to finish.`);
    } catch (error: any) {
      setTestDataMessage(`❌ ${error.message}`);
    } finally {
      setTestDataLoading(false);
    }
  };

  const handleGenerateRelationshipsOnly = async () => {
    if (!currentUser) {
      setTestDataMessage("❌ You must be logged in to generate relationships");
      return;
    }

    setTestDataLoading(true);
    setTestDataMessage("");
    
    try {
      const result = await testDataService.generateRelationshipsOnly();
      setTestDataMessage(`✅ ${result.message}`);
    } catch (error: any) {
      setTestDataMessage(`❌ ${error.message}`);
    } finally {
      setTestDataLoading(false);
    }
  };

  const handleCleanTestData = async () => {
    if (!currentUser) {
      setTestDataMessage("❌ You must be logged in to clean test data");
      return;
    }

    setTestDataLoading(true);
    setTestDataMessage("");
    
    try {
      const result = await testDataService.cleanTestData();
      setTestDataMessage(`✅ ${result.message}`);
    } catch (error: any) {
      setTestDataMessage(`❌ ${error.message}`);
    } finally {
      setTestDataLoading(false);
    }
  };

  const handleGenerateButtonClick = () => {
    if (useSequentialMode) {
      generateSequentially();
    } else {
      handleGenerateTestData();
    }
  };

  // Format date helper
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Unknown";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to access the admin panel.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <Card className="shadow-md border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Admin Profile
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage your admin account details
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {adminProfile?.status && (
                  <Badge 
                    variant={
                      adminProfile.status === USER_STATUS.APPROVED 
                        ? "default" 
                        : adminProfile.status === USER_STATUS.PENDING
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {adminProfile.status.toUpperCase()}
                  </Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <Shield className="h-3 w-3" />
                  ADMIN
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span>Loading profile...</span>
              </div>
            ) : profileError ? (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                <p className="font-medium">Error: {profileError}</p>
                {!isAdmin && (
                  <p className="text-sm mt-1">You need admin privileges to view this profile.</p>
                )}
              </div>
            ) : adminProfile ? (
              <>
                {/* Main Form - Same layout for both view and edit */}
                <div className="space-y-6">
                  {/* Admin Information */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-4">
                      <User className="h-4 w-4" />
                      Admin Information
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          value={editableProfile.name}
                          onChange={(e) => setEditableProfile(prev => ({ 
                            ...prev, 
                            name: e.target.value 
                          }))}
                          placeholder="Enter your full name"
                          required
                          className={`h-10 ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                          readOnly={!isEditing}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email Address
                        </Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <Input
                            id="email"
                            value={editableProfile.email}
                            className="h-10 bg-gray-50 border-gray-200 text-gray-600"
                            readOnly
                            disabled
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                          Phone Number *
                        </Label>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <Input
                            id="phone"
                            value={editableProfile.phone}
                            onChange={(e) => setEditableProfile(prev => ({ 
                              ...prev, 
                              phone: e.target.value 
                            }))}
                            placeholder="+60 12-345 6789"
                            required
                            className={`h-10 ${isEditing ? 'bg-white border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                            readOnly={!isEditing}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {!isEditing && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Admin Account Verified</p>
                        <p className="text-xs text-green-600 mt-0.5">
                          Last updated: {formatDate(adminProfile.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {isEditing ? (
                      <>
                        <Button 
                          onClick={handleSaveProfile} 
                          disabled={saveLoading}
                          className="flex-1 bg-green-500 hover:from-green-700 hover:to-emerald-700"
                        >
                          {saveLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                          disabled={saveLoading}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => setIsEditing(true)}
                        variant="default"
                        className="flex-1 bg-green-500"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No admin profile found</p>
                <p className="text-sm mt-1">Please contact system administrator</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Data Management Card */}
        <Card className="shadow-sm border-0 bg-white border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Test Data Management
              <Badge variant="outline" className="text-xs">
                Admin Only
              </Badge>
            </CardTitle>
            <CardDescription>
              Generate or clean test data for development and testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="usersCount" className="text-xs">Users</Label>
                <Input
                  id="usersCount"
                  type="number"
                  min="0"
                  max="1000"
                  value={testDataConfig.usersCount}
                  onChange={(e) => setTestDataConfig(prev => ({ 
                    ...prev, 
                    usersCount: parseInt(e.target.value) || 0 
                  }))}
                  className="h-8 text-sm"
                  disabled={testDataLoading || useExistingUsers}
                  style={{ opacity: useExistingUsers ? 0.5 : 1 }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foodListingsCount" className="text-xs">Food Listings</Label>
                <Input
                  id="foodListingsCount"
                  type="number"
                  min="0"
                  max="1000"
                  value={testDataConfig.foodListingsCount}
                  onChange={(e) => setTestDataConfig(prev => ({ 
                    ...prev, 
                    foodListingsCount: parseInt(e.target.value) || 0 
                  }))}
                  className="h-8 text-sm"
                  disabled={testDataLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaignsCount" className="text-xs">Campaigns</Label>
                <Input
                  id="campaignsCount"
                  type="number"
                  min="0"
                  max="1000"
                  value={testDataConfig.campaignsCount}
                  onChange={(e) => setTestDataConfig(prev => ({ 
                    ...prev, 
                    campaignsCount: parseInt(e.target.value) || 0 
                  }))}
                  className="h-8 text-sm"
                  disabled={testDataLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pastMonths" className="text-xs">Past Months</Label>
                <Input
                  id="pastMonths"
                  type="number"
                  min="1"
                  max="24"
                  value={testDataConfig.pastMonths}
                  onChange={(e) => setTestDataConfig(prev => ({ 
                    ...prev, 
                    pastMonths: parseInt(e.target.value) || 0 
                  }))}
                  className="h-8 text-sm"
                  disabled={testDataLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                <input
                  type="checkbox"
                  id="useExistingUsers"
                  checked={useExistingUsers}
                  onChange={(e) => setUseExistingUsers(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={testDataLoading}
                />
                <Label htmlFor="useExistingUsers" className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Use existing test users (set Users to 0)
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
                <input
                  type="checkbox"
                  id="useSequentialMode"
                  checked={useSequentialMode}
                  onChange={(e) => setUseSequentialMode(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={testDataLoading}
                />
                <Label htmlFor="useSequentialMode" className="text-xs flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Use sequential mode (Recommended for large datasets)
                </Label>
              </div>
            </div>

            {useExistingUsers && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                <p className="font-medium mb-1">⚠️ Using Existing Test Users</p>
                <p>• Set "Users" to 0 to use existing test users in database</p>
              </div>
            )}

            {useSequentialMode && (
              <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                <p className="font-medium mb-1">⚡ Sequential Mode Active</p>
                <p>• Generates data in 4 separate steps to avoid timeout</p>
                <p>• Step 1: Users, Step 2: Listings, Step 3: Campaigns, Step 4: Relationships</p>
              </div>
            )}

            <div className="flex gap-2 flex-col sm:flex-row">
              <Button 
                onClick={handleGenerateButtonClick} 
                disabled={testDataLoading}
                className="flex-1"
                variant="default"
              >
                {testDataLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                {useSequentialMode ? "Generate Sequentially" : "Generate Test Data"}
              </Button>

              <Button 
                onClick={handleGenerateRelationshipsOnly} 
                disabled={testDataLoading}
                variant="secondary"
                className="flex-1"
              >
                {testDataLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Generate Relationships Only
              </Button>
              
              <Button 
                onClick={handleCleanTestData} 
                disabled={testDataLoading}
                variant="destructive"
                className="flex-1"
              >
                {testDataLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clean Test Data
              </Button>
            </div>

            {testDataMessage && (
              <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                testDataMessage.includes('✅') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : testDataMessage.includes('❌')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {testDataMessage}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="pt-2 font-medium text-blue-700">
                💡 <strong>TIP:</strong> If "Users" generation stops at ~40, you are hitting the Firebase Auth rate limit. Wait 30 mins and try again with "Use existing users" checked.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}