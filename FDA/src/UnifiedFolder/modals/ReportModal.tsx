// ReportModal.tsx - Updated with open/onOpenChange props
import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { 
  AlertTriangle, 
  X, 
  Clock,
  CheckCircle2,
  Send,
  User,
  Utensils,
  Users,
  Upload,
  File,
  Image,
  Trash2
} from "lucide-react";
import { uploadReportEvidence } from "../../Firebase/firebase-storage";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: 'food' | 'volunteer' | 'campaign';
  targetId: string;
  targetName: string;
  reportedUser?: {
    id: string;
    name: string;
    email: string;
    type: 'donor' | 'volunteer' | 'receiver';
  };
  onClose: () => void;
  onSubmit: (reportData: any) => void;
}

export function ReportModal({ 
  open, 
  onOpenChange, 
  reportType, 
  targetId, 
  targetName, 
  reportedUser, 
  onClose, 
  onSubmit 
}: ReportModalProps) {
  const [formData, setFormData] = useState({
    reason: "",
    description: "",
    severity: "",
    evidence: ""
  });

  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeReportedUser = reportedUser || {
    id: 'unknown',
    name: 'Unknown User',
    email: 'unknown@example.com',
    type: 'donor' as const
  };

  const getFoodReasons = () => [
    { value: "expired", label: "Food appears expired or spoiled" },
    { value: "hygiene", label: "Poor hygiene or food safety concerns" },
    { value: "misleading", label: "Misleading description or photos" },
    { value: "unavailable", label: "Food not available as advertised" },
    { value: "location", label: "Incorrect pickup location" },
    { value: "inappropriate", label: "Inappropriate content or behavior" },
    { value: "fraud", label: "Suspected fraud or scam" },
    { value: "other", label: "Other concern" }
  ];

  const getCampaignReasons = () => [
    { value: "misleading", label: "Misleading information" },
    { value: "no_show", label: "Organizer didn't show up" },
    { value: "unprofessional", label: "Unprofessional behavior" },
    { value: "safety", label: "Safety concerns or violations" },
    { value: "harassment", label: "Harassment or inappropriate conduct" },
    { value: "location", label: "Incorrect location" },
    { value: "fraud", label: "Suspected fraud or scam" },
    { value: "other", label: "Other concern" }
  ];

  const reasons = reportType === 'food' ? getFoodReasons() : getCampaignReasons();

  const severityLevels = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800", description: "Minor issue" },
    { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-600", description: "Moderate concern" },
    { value: "high", label: "High", color: "bg-red-100 text-red-600", description: "Urgent safety issue" }
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Validate file types and sizes
    const validFiles = newFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not a supported type. Please upload JPEG, PNG, or PDF files.`);
        return false;
      }
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    setEvidenceFiles(prev => [...prev, ...validFiles]);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadEvidenceFiles = async (): Promise<string[]> => {
    if (evidenceFiles.length === 0) return [];

    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < evidenceFiles.length; i++) {
      const file = evidenceFiles[i];
      try {
        // Update progress
        setUploadProgress(Math.round((i / evidenceFiles.length) * 100));
        
        // Upload file to Report_Evidence_Folder
        const downloadURL = await uploadReportEvidence(file);
        uploadedUrls.push(downloadURL);
        
      } catch (error) {
        console.error('Error uploading evidence file:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploadProgress(100);
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    
    try {
      // Upload evidence files first
      const evidenceUrls = await uploadEvidenceFiles();
      
      // Simulate additional processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reportData = {
        ...formData,
        reportType,
        targetId,
        targetName,
        reportedUser: safeReportedUser,
        evidenceUrls, // Array of uploaded file URLs
        timestamp: new Date().toISOString(),
        id: `report_${Date.now()}`
      };
      
      setIsSubmitting(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        onSubmit(reportData);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      setIsSubmitting(false);
      alert('Failed to upload evidence files. Please try again.');
    }
  };

  const isFormValid = formData.reason && formData.description.trim().length > 10;

  const getReportTypeIcon = () => {
    switch (reportType) {
      case 'food': return Utensils;
      case 'campaign': return Users;
      default: return User;
    }
  };

  const getReportTypeColor = () => {
    switch (reportType) {
      case 'food': return 'bg-orange-500';
      case 'campaign': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const ReportTypeIcon = getReportTypeIcon();

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!open) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto transform transition-all">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Report Submitted</h3>
                  <p className="text-sm text-gray-600">Successfully sent to admin</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800 leading-relaxed">
                Your report has been successfully submitted and is pending review by our administration team. 
                You will be notified once action is taken.
              </p>
            </div>
            
            <Button 
              onClick={onClose}
              className="w-full h-12 font-medium text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              Continue Browsing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl border-0 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center text-lg">
            <div className={`w-10 h-10 ${getReportTypeColor()} rounded-xl flex items-center justify-center mr-3`}>
              <ReportTypeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-800">
                Report {reportType === 'food' ? 'Food Item' : 'Campaign'}
              </div>
              <div className="text-sm text-gray-600 font-normal">
                Help maintain community standards
              </div>
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="p-2 rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Target Info */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Reporting:</p>
            <p className="font-medium text-gray-800">{targetName}</p>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>Posted by: {safeReportedUser.name}</span>
            </div>
          </div>

          {/* Important Notice */}
          <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Important</h4>
              <p className="text-sm text-amber-700 mt-1">
                Please only submit reports for genuine safety, quality, or conduct concerns. 
                False reports may result in account restrictions.
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>What is the issue? *</Label>
            <Select value={formData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white">
                <SelectValue placeholder="Select the reason for your report" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value} className="text-sm">
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Level */}
          <div className="space-y-2">
            <Label>Severity Level</Label>
            <Select value={formData.severity} onValueChange={(value) => handleInputChange("severity", value)}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white">
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide specific details about the issue. Include dates, times, and any relevant information..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-[120px] rounded-xl border-gray-200 bg-white resize-none"
            />
            <p className="text-sm text-gray-500">
              {formData.description.length}/500 characters (minimum 10 required)
            </p>
          </div>

          {/* Evidence - File Upload */}
          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence (Optional)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.heic,.heif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 border-2 border-gray-200 bg-white hover:bg-gray-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Evidence Files
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Supported: JPG, PNG, PDF • Max 10MB per file
              </p>
            </div>

            {/* Upload Progress */}
            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading evidence...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* File List */}
            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Selected Files:</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {evidenceFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Timeline Notice */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Response Time:</span> We review reports within 24-48 hours. 
                High severity issues are prioritized for immediate attention.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
              className="flex-1 h-12 font-medium text-sm rounded-xl border-2 border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={`flex-1 h-12 font-medium text-sm rounded-xl border-2 ${getReportTypeColor().replace('bg-', 'border-').replace('500', '200')} ${getReportTypeColor()} hover:${getReportTypeColor().replace('500', '600')} text-white`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 animate-spin" />
                  {uploadProgress > 0 ? 'Uploading...' : 'Submitting...'}
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}