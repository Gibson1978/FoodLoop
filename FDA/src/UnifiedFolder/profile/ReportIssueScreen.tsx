// ReportIssueScreen.tsx - Updated to use UserData
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { 
  ArrowLeft, 
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Bug,
  Smartphone,
  User
} from "lucide-react";
import { reportService } from "../../Firebase/userReport";
import { getCurrentUserData, type UserData } from "../../Firebase/auth";

interface ReportIssueScreenProps {
  onBack: () => void;
}

export function ReportIssueScreen({ onBack }: ReportIssueScreenProps) {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [reportType, setReportType] = useState("");
  const [explanation, setExplanation] = useState("");
  const [severity, setSeverity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getCurrentUserData();
        setCurrentUser(userData);
      } catch (error) {
        console.error("Failed to load user data:", error);
        // User can still submit report without user data
      }
    };

    loadUserData();
  }, []);

  const systemReportTypes = [
    { value: "technical_bug", label: "Technical Bug", icon: Bug },
    { value: "app_crash", label: "App Crash", icon: AlertCircle },
    { value: "performance", label: "Performance Issue", icon: Smartphone },
    { value: "ui_issue", label: "UI/UX Problem", icon: Smartphone },
    { value: "feature_request", label: "Feature Request", icon: User },
    { value: "other_system", label: "Other System Issue", icon: AlertCircle }
  ];

  const severityLevels = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800", description: "Minor issue" },
    { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-600", description: "Moderate concern" },
    { value: "high", label: "High", color: "bg-red-100 text-red-600", description: "Critical system issue" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!reportType || !explanation.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare reporter user info from UserData
      const reporterUser = currentUser ? {
        id: currentUser.uid,
        name: currentUser.profile?.name || 'Anonymous User',
        email: currentUser.email
      } : {
        id: 'anonymous',
        name: 'Anonymous User', 
        email: 'anonymous@example.com'
      };

      // Prepare report data for Firestore
      const reportData = {
        reportType: 'system' as const,
        targetId: 'system',
        targetName: `System Issue: ${systemReportTypes.find(t => t.value === reportType)?.label || 'Unknown'}`,
        reportedUser: {
          id: 'system',
          name: 'System',
          email: 'system@example.com',
          type: 'donor' as const // Default type, doesn't matter for system reports
        },
        reporterUser: reporterUser,
        reason: reportType,
        description: explanation,
        severity: (severity || 'medium') as 'low' | 'medium' | 'high',
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Submit to Firestore
      const reportId = await reportService.submitReport(reportData);
      
      console.log("System report submitted with ID:", reportId);
      
      setIsSubmitting(false);
      setShowPopup(true);
      
      // Reset form
      setReportType("");
      setExplanation("");
      setSeverity("");
      
    } catch (error) {
      console.error("Error submitting system report:", error);
      setError("Failed to submit report. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const getCurrentReportType = () => {
    return systemReportTypes.find(type => type.value === reportType);
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-10">
      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">System Report Submitted</h3>
                    <p className="text-sm text-gray-600">Thank you for your feedback</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePopup}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-green-800 leading-relaxed">
                  Your system issue report has been received. Our technical team will review it and work on improvements.
                  We appreciate your help in making our app better.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleClosePopup}
                  className="w-full h-12 font-medium text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  Continue Browsing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onBack}
                  className="w-full h-12 font-medium text-sm rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] px-4 sm:px-6 pt-6 pb-8 flex items-center min-h-[150px] sm:min-h-[150px] rounded-b-lg">
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
                <Bug className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Report System Issues</h1>
              <p className="text-white/90 text-sm sm:text-base">Help us improve the app</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-8 sm:-mt-10 pt-6">
        <Card className="shadow-lg border-0 rounded-2xl ">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-gray-800">Report System Issue</CardTitle>
                <p className="text-sm text-gray-600">
                  Found a bug or having technical problems?
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Report Type */}
              <div className="space-y-2">
                <Label htmlFor="report-type" className="text-sm font-medium text-gray-700">
                  Issue Type *
                </Label>
                <Select value={reportType} onValueChange={setReportType} required>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-gray-200 bg-white focus:border-blue-300">
                    <SelectValue placeholder="Select the type of system issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemReportTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value} className="text-sm">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Level */}
              <div className="space-y-2">
                <Label htmlFor="severity" className="text-sm font-medium text-gray-700">
                  Severity Level
                </Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="h-11 text-sm rounded-xl border-gray-200 bg-white focus:border-blue-300">
                    <SelectValue placeholder="How serious is this issue?" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value} className="text-sm">
                        <div className="flex items-center justify-between w-full">
                          <span>{level.label}</span>
                          <Badge className={`${level.color} text-xs px-2 py-1 rounded-full`}>
                            {level.description}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation" className="text-sm font-medium text-gray-700">
                  Detailed Description *
                </Label>
                <Textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Please describe the issue in detail. Include steps to reproduce, what you expected to happen, and what actually happened..."
                  rows={4}
                  required
                  className="resize-none text-sm rounded-xl border-gray-200 bg-white focus:border-blue-300 min-h-[100px]"
                />
                <p className="text-xs text-gray-500">
                  The more details you provide, the better we can fix the issue
                </p>
              </div>

              {/* Current Issue Info */}
              {getCurrentReportType() && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 mb-2 font-medium">
                        Tips for {getCurrentReportType()?.label}
                      </p>
                      <ul className="text-blue-700 space-y-1 text-xs leading-relaxed">
                        {reportType === 'technical_bug' && (
                          <>
                            <li>• Include specific error messages you received</li>
                            <li>• Mention what you were doing when the bug occurred</li>
                            <li>• Note your device type and app version</li>
                          </>
                        )}
                        {reportType === 'app_crash' && (
                          <>
                            <li>• Describe what screen you were on when it crashed</li>
                            <li>• Mention if it happens consistently or randomly</li>
                            <li>• Include your device model and OS version</li>
                          </>
                        )}
                        {reportType === 'performance' && (
                          <>
                            <li>• Describe which actions are slow</li>
                            <li>• Mention your internet connection type</li>
                            <li>• Note if it happens on mobile data or WiFi</li>
                          </>
                        )}
                        {reportType === 'feature_request' && (
                          <>
                            <li>• Explain the problem this feature would solve</li>
                            <li>• Describe how you envision the feature working</li>
                            <li>• Mention if similar features exist in other apps</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 h-12 font-medium text-sm rounded-xl border-2 border-gray-300 text-gray-700"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!reportType || !explanation.trim() || isSubmitting}
                  className="flex-1 h-12 font-medium text-sm rounded-xl border-2 border-blue-200 bg-blue-500 hover:bg-blue-600"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}