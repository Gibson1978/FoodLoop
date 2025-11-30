import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { 
  Database,
  Trash2,
  Loader2,
  Shield
} from "lucide-react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import app from "../../Firebase/Firebase";
import { testDataService, type TestDataConfig } from "../../services/testDataServices";

export function ProfileTab() {
  const [testDataLoading, setTestDataLoading] = useState(false);
  const [testDataMessage, setTestDataMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [testDataConfig, setTestDataConfig] = useState<TestDataConfig>({
    usersCount: 5,
    foodListingsCount: 10,
    campaignsCount: 5,
    pastMonths: 1,
    futureDays: 7
  });

  const auth = getAuth(app);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleGenerateTestData = async () => {
    if (!currentUser) {
      setTestDataMessage("❌ You must be logged in to generate test data");
      return;
    }

    setTestDataLoading(true);
    setTestDataMessage("");
    
    try {
      const result = await testDataService.generateTestData(testDataConfig);
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
      {/* Test Data Management */}
      <Card className="shadow-sm border-0 bg-white border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
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
          {/* Configuration Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="usersCount" className="text-xs">Users</Label>
              <Input
                id="usersCount"
                type="number"
                min="1"
                max="1000"
                value={testDataConfig.usersCount}
                onChange={(e) => setTestDataConfig(prev => ({ 
                  ...prev, 
                  usersCount: parseInt(e.target.value) || 0 
                }))}
                className="h-8 text-sm"
                disabled={testDataLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foodListingsCount" className="text-xs">Food Listings</Label>
              <Input
                id="foodListingsCount"
                type="number"
                min="1"
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
                min="1"
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

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateTestData} 
              disabled={testDataLoading}
              className="flex-1"
              variant="default"
            >
              {testDataLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Generate Test Data
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

          {/* Status Message */}
          {testDataMessage && (
            <div className={`p-3 rounded-lg text-sm ${
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
            <p className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Requires administrator privileges
            </p>
            <p>• Generates users, food listings, campaigns, and related data</p>
            <p>• Clean function removes all test data with isTestData: true</p>
            <p>• Uses Firebase Callable Functions for secure communication</p>
            <p>• Current user: {currentUser.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}