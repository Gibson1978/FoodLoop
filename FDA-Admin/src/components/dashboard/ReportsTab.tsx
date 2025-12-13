// admin-app/src/components/ReportsTab.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import { 
  Flag, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User,
  Calendar,
  Utensils,
  Users,
  Bug,
  Smartphone,
  Mail,
  RefreshCw
} from "lucide-react";
import { reportAdminService, type Report } from "../../Firebase/reportAdmin";

// ⬅️ FIX: Import the authentication object to get the current user's ID
import { auth } from "../../Firebase/Firebase"; 

// UI Report interface for the admin display
interface UIReport {
  id: string;
  type: "food" | "campaign" | "system" | "user" | "feature_request";
  title: string;
  description: string;
  reporter: {
    name: string;
    email: string;
    avatar?: string;
  };
  reportedUser?: {
    name: string;
    email: string;
    avatar?: string;
  };
  status: "pending" | "under_review" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  evidenceUrls?: string[];
  originalReport: Report;
}

// Component to render the detail card
const ReportDetailCard = ({ 
  report, 
  onClose, 
  isUpdating,
  onStatusUpdate,
  onResponseSubmit
}: {
  report: UIReport;
  onClose: () => void;
  isUpdating: boolean;
  // Handler for simple status change (under review, or final status without notes)
  onStatusUpdate: (reportId: string, newStatus: UIReport['status']) => Promise<void>;
  // Handler for status change WITH notes (Resolved/Dismissed)
  onResponseSubmit: (reportId: string, newStatus: UIReport['status'], response: string) => Promise<void>;
}) => {
  const [currentAdminResponse, setCurrentAdminResponse] = useState(report.adminNotes || "");
  const [resolutionError, setResolutionError] = useState<string | null>(null); // State for UI Error Message

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: "bg-green-100 text-green-700 border-green-200",
      medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
      high: "bg-red-100 text-red-700 border-red-200"
    };
    
    return (
      <Badge variant="outline" className={`text-xs ${priorityConfig[priority as keyof typeof priorityConfig]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </Badge>
    );
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "food":
        return <Utensils className="h-4 w-4 text-orange-600" />;
      case "campaign":
        return <Users className="h-4 w-4 text-blue-600" />;
      case "system":
        return <Bug className="h-4 w-4 text-purple-600" />;
      case "user":
        return <User className="h-4 w-4 text-red-600" />;
      case "feature_request":
        return <Smartphone className="h-4 w-4 text-green-600" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const isFinalStatus = report.status === "resolved" || report.status === "dismissed";
  const isUnderReview = report.status === "under_review";
  const isPending = report.status === "pending";

  const handleFinalStatusAction = (finalStatus: 'resolved' | 'dismissed') => {
    setResolutionError(null);
    if (!currentAdminResponse.trim()) {
        setResolutionError(`A resolution note is required to mark the report as ${finalStatus}. Please provide a note below.`);
        return;
    }
    
    // Call the complex submit handler with the final status and the note
    onResponseSubmit(report.id, finalStatus, currentAdminResponse);
  };

  // ⬅️ FIX: Renamed handleSubmmit to handleNoteSubmission for consistency
  const handleSubmit = () => {
    setResolutionError(null);
    if (!currentAdminResponse.trim()) return;

    // Submitting note defaults to 'under_review' if pending, otherwise keeps status
    const newStatus = isPending ? 'under_review' : report.status;
    onResponseSubmit(report.id, newStatus, currentAdminResponse);
  };

  return (
    <Card className="shadow-lg border-2 border-blue-200 bg-white mt-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getTypeIcon(report.type)}
              {report.title}
            </CardTitle>
            <CardDescription>
              {report.type.charAt(0).toUpperCase() + report.type.slice(1).replace('_', ' ')} • Created {report.createdAt.toLocaleString()}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isUpdating}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status and Priority */}
        <div className="flex items-center gap-4">
          {getPriorityBadge(report.priority)}
          {report.status === 'resolved' && <Badge className="bg-green-100 text-green-700">Resolved By: {report.originalReport.resolvedBy}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Reporter Information */}
          <div>
            <h4 className="font-medium mb-2">Reported By</h4>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {report.reporter.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{report.reporter.name}</p>
                <p className="text-sm text-muted-foreground">{report.reporter.email}</p>
              </div>
            </div>
          </div>

          {/* Reported User (if applicable) */}
          {report.reportedUser && (
            <div>
              <h4 className="font-medium mb-2">Reported User/Organization</h4>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {report.reportedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{report.reportedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{report.reportedUser.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h4 className="font-medium mb-2">Description</h4>
          <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
            {report.description}
          </p>
        </div>

        {/* Evidence (if available) */}
        {report.evidenceUrls && report.evidenceUrls.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Evidence</h4>
            <div className="flex flex-wrap gap-2">
              {report.evidenceUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  <span>Evidence {index + 1}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Admin Notes / Response */}
        {report.adminNotes && (
          <div>
            <h4 className="font-medium mb-2">Previous Admin Note</h4>
            <p className="text-sm bg-green-50 border border-green-200 p-3 rounded-lg whitespace-pre-wrap">
              {report.adminNotes}
            </p>
          </div>
        )}

        {/* Action Buttons and Response */}
        {!isFinalStatus && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium mb-2">Action / Resolution</h4>

            {/* UI Validation Message */}
            {resolutionError && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm rounded-lg">
                    <AlertTriangle className="h-4 w-4 inline mr-2"/>
                    {resolutionError}
                </div>
            )}
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => handleFinalStatusAction('resolved')}
                disabled={isUpdating}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                {isUpdating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Mark as Resolved
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleFinalStatusAction('dismissed')}
                disabled={isUpdating}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {isUpdating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Dismiss Report
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onStatusUpdate(report.id, "under_review")}
                disabled={isUnderReview || isUpdating}
              >
                Mark Under Review (No Note)
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Resolution Note (Required for Notification)</h4>
              <Textarea
                placeholder="Type your final resolution note here. This will be sent to the reporter."
                value={currentAdminResponse}
                onChange={(e) => setCurrentAdminResponse(e.target.value)}
                className="min-h-[100px]"
                disabled={isUpdating}
              />
              <Button 
                className="mt-2" 
                onClick={() => handleSubmit()} // Submitting note defaults to 'under_review' if pending
                disabled={!currentAdminResponse.trim() || isUpdating}
              >
                {isUpdating ? "Submitting..." : (isPending ? "Submit Note & Set Review" : "Submit Note")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export function ReportsTab() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null); // Only track ID for inline rendering
  const [reports, setReports] = useState<UIReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const selectedReport = reports.find(r => r.id === selectedReportId) || null;

  // Map Firestore Report to UI Report
  const mapToUIReport = (firestoreReport: Report): UIReport => {
    // Generate title based on report data
    const getTitle = () => {
      switch (firestoreReport.reportType) {
        case 'food':
          return `Food Report: ${firestoreReport.targetName}`;
        case 'campaign':
          return `Campaign Report: ${firestoreReport.targetName}`;
        case 'system':
          // Map system reasons to readable titles
          const systemTitles: Record<string, string> = {
            technical_bug: "Technical Bug Report",
            app_crash: "App Crash Report",
            performance: "Performance Issue",
            ui_issue: "UI/UX Problem",
            feature_request: "Feature Request",
            other_system: "Other System Issue"
          };
          return systemTitles[firestoreReport.reason] || `System: ${firestoreReport.reason}`;
        case 'user':
          return `User Report: ${firestoreReport.targetName}`;
        default:
          return firestoreReport.targetName;
      }
    };

    // Map severity to priority
    const getPriority = (severity: string): "low" | "medium" | "high" => {
      return severity as "low" | "medium" | "high";
    };

    return {
      id: firestoreReport.id || '',
      type: firestoreReport.reportType === 'system' && firestoreReport.reason === 'feature_request' 
        ? 'feature_request' 
        : firestoreReport.reportType,
      title: getTitle(),
      description: firestoreReport.description,
      reporter: {
        name: firestoreReport.reporterUser?.name || 'Anonymous User',
        email: firestoreReport.reporterUser?.email || 'anonymous@example.com'
      },
      reportedUser: firestoreReport.reportedUser ? {
        name: firestoreReport.reportedUser.name,
        email: firestoreReport.reportedUser.email
      } : undefined,
      status: firestoreReport.status,
      priority: getPriority(firestoreReport.severity),
      createdAt: firestoreReport.createdAt,
      updatedAt: firestoreReport.updatedAt,
      adminNotes: firestoreReport.adminNotes,
      evidenceUrls: firestoreReport.evidenceUrls,
      originalReport: firestoreReport
    };
  };

  // Load reports from Firestore
  useEffect(() => {
    setIsLoading(true);
    
    const unsubscribe = reportAdminService.subscribeToReports((firestoreReports) => {
      const uiReports = firestoreReports.map(mapToUIReport);
      setReports(uiReports);
      setIsLoading(false);
      // Close detail view if the selected report disappears (e.g. manually deleted)
      if (selectedReportId && !uiReports.some(r => r.id === selectedReportId)) {
        setSelectedReportId(null);
      }
    });

    return () => unsubscribe();
  }, [selectedReportId]); // Re-run effect if selectedReportId changes to ensure integrity

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "destructive" as const, icon: Clock, label: "Pending" },
      under_review: { variant: "default" as const, icon: AlertTriangle, label: "Under Review" },
      resolved: { variant: "secondary" as const, icon: CheckCircle, label: "Resolved" },
      dismissed: { variant: "outline" as const, icon: XCircle, label: "Dismissed" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "food":
        return <Utensils className="h-4 w-4 text-orange-600" />;
      case "campaign":
        return <Users className="h-4 w-4 text-blue-600" />;
      case "system":
        return <Bug className="h-4 w-4 text-purple-600" />;
      case "user":
        return <User className="h-4 w-4 text-red-600" />;
      case "feature_request":
        return <Smartphone className="h-4 w-4 text-green-600" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      food: "Food Donation",
      campaign: "Campaign",
      system: "System Issue",
      user: "User Report",
      feature_request: "Feature Request"
    };
    return labels[type] || type;
  };

  const filteredReports = activeTab === "all" 
    ? reports 
    : reports.filter(report => report.status === activeTab);

  // Unified Handler for Status/Response Update (called by the Detail Card)
  const handleReportUpdate = useCallback(async (
    reportId: string, 
    newStatus: UIReport['status'], 
    notes?: string
  ) => {
    setIsUpdating(true);
    try {
      // ⬅️ FIX: Get admin UID for resolvedBy field
      const adminUID = auth.currentUser?.uid || 'ADMIN_UNKNOWN'; 
      
      await reportAdminService.updateReportStatus(
        reportId, 
        newStatus,
        notes, // Admin notes passed here
        newStatus === 'resolved' || newStatus === 'dismissed' ? adminUID : undefined // resolvedBy only set on final status
      );
      
      // Update local state and close/update detail view
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus, adminNotes: notes || report.adminNotes, updatedAt: new Date(), originalReport: {...report.originalReport, adminNotes: notes} }
          : report
      ));
      
      // Check if the update resolves the report and deselect it
      if (reportId === selectedReportId && (newStatus === 'resolved' || newStatus === 'dismissed')) {
          setSelectedReportId(null);
      }
    } catch (error) {
      console.error('Error updating report status/response:', error);
      alert('Failed to update report. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedReportId]);

  const handleSimpleStatusUpdate = useCallback(async (
    reportId: string, 
    newStatus: UIReport['status']
  ) => {
      // For simple status updates like 'under_review' which don't require notes, we simply call the main handler
      const notes = selectedReport?.adminNotes || undefined;
      await handleReportUpdate(reportId, newStatus, notes);
  }, [handleReportUpdate, selectedReport]);
  
  const handleDetailAction = useCallback(async (
    reportId: string, 
    newStatus: UIReport['status'], 
    response: string
  ) => {
    // This handler manages final status changes/note submissions from the detail card
    await handleReportUpdate(reportId, newStatus, response);
  }, [handleReportUpdate]);


  const getReportCounts = () => {
    return {
      all: reports.length,
      pending: reports.filter(r => r.status === "pending").length,
      under_review: reports.filter(r => r.status === "under_review").length,
      resolved: reports.filter(r => r.status === "resolved").length,
      dismissed: reports.filter(r => r.status === "dismissed").length
    };
  };

  const counts = getReportCounts();

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            Reports Management
          </CardTitle>
          <CardDescription>
            Monitor and respond to user reports and system issues in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="under_review">
                Review ({counts.under_review})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({counts.resolved})
              </TabsTrigger>
              <TabsTrigger value="dismissed">
                Dismissed ({counts.dismissed})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading reports...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No reports found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? 'No reports have been submitted yet.' 
                      : `No ${activeTab.replace('_', ' ')} reports found.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report.id}>
                      <div
                        className={`border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer ${report.id === selectedReportId ? 'bg-blue-50 border-blue-300 mb-4' : ''}`}
                        onClick={() => setSelectedReportId(report.id === selectedReportId ? null : report.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(report.type)}
                            <div>
                              <h3 className="font-medium">{report.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {getTypeLabel(report.type)} • {report.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Re-implement getPriorityBadge logic directly inside map or move helper out */}
                            <Badge variant="outline" className={`text-xs ${report.priority === 'low' ? "bg-green-100 text-green-700 border-green-200" : report.priority === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                              {report.priority.charAt(0).toUpperCase() + report.priority.slice(1)} Priority
                            </Badge>
                            {getStatusBadge(report.status)}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {report.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>By {report.reporter.name}</span>
                            </div>
                            {report.reportedUser && (
                              <div className="flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                <span>Regarding {report.reportedUser.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Updated {report.updatedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detail Card rendered right after the selected item */}
                      {report.id === selectedReportId && selectedReport && (
                          <div className="mt-4 mb-4"> {/* Added vertical margin for spacing */}
                            <ReportDetailCard
                                report={selectedReport}
                                onClose={() => setSelectedReportId(null)}
                                isUpdating={isUpdating}
                                onStatusUpdate={handleSimpleStatusUpdate}
                                onResponseSubmit={handleDetailAction}
                            />
                          </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}