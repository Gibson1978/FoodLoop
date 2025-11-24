// admin-app/src/components/ReportsTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
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
  Mail
} from "lucide-react";
import { reportAdminService, type Report } from "../../Firebase/reportAdmin";

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

export function ReportsTab() {
  const [selectedReport, setSelectedReport] = useState<UIReport | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [reports, setReports] = useState<UIReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
    });

    return () => unsubscribe();
  }, []);

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

  const handleStatusUpdate = async (reportId: string, newStatus: UIReport['status']) => {
    setIsUpdating(true);
    try {
      await reportAdminService.updateReportStatus(reportId, newStatus);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus }
          : report
      ));
      
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('Failed to update report status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdminResponse = async (reportId: string) => {
    if (!adminResponse.trim()) return;
    
    setIsUpdating(true);
    try {
      await reportAdminService.updateReportStatus(
        reportId, 
        selectedReport?.status || 'under_review', 
        adminResponse,
        'admin' // You would get this from admin auth context
      );
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, adminNotes: adminResponse }
          : report
      ));
      
      setAdminResponse("");
      setSelectedReport(prev => prev ? { ...prev, adminNotes: adminResponse } : null);
    } catch (error) {
      console.error('Error submitting admin response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

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
                    <div
                      key={report.id}
                      className="border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedReport(report)}
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
                          {getPriorityBadge(report.priority)}
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
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Detail Sidebar */}
      {selectedReport && (
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getTypeIcon(selectedReport.type)}
                  {selectedReport.title}
                </CardTitle>
                <CardDescription>
                  {getTypeLabel(selectedReport.type)} • Created {selectedReport.createdAt.toLocaleString()}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedReport(null)}
                disabled={isUpdating}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status and Priority */}
            <div className="flex items-center gap-4">
              {getStatusBadge(selectedReport.status)}
              {getPriorityBadge(selectedReport.priority)}
            </div>

            {/* Reporter Information */}
            <div>
              <h4 className="font-medium mb-2">Reported By</h4>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedReport.reporter.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedReport.reporter.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReport.reporter.email}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </div>

            {/* Reported User (if applicable) */}
            {selectedReport.reportedUser && (
              <div>
                <h4 className="font-medium mb-2">Reported User/Organization</h4>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedReport.reportedUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{selectedReport.reportedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedReport.reportedUser.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                {selectedReport.description}
              </p>
            </div>

            {/* Evidence (if available) */}
            {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Evidence</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.evidenceUrls.map((url, index) => (
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

            {/* Previous Admin Response */}
            {selectedReport.adminNotes && (
              <div>
                <h4 className="font-medium mb-2">Admin Response</h4>
                <p className="text-sm bg-green-50 border border-green-200 p-3 rounded-lg whitespace-pre-wrap">
                  {selectedReport.adminNotes}
                </p>
              </div>
            )}

            {/* Action Buttons and Response */}
            {selectedReport.status !== "resolved" && selectedReport.status !== "dismissed" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate(selectedReport.id, "under_review")}
                    disabled={selectedReport.status === "under_review" || isUpdating}
                  >
                    Mark as Under Review
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate(selectedReport.id, "resolved")}
                    disabled={isUpdating}
                  >
                    Mark as Resolved
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusUpdate(selectedReport.id, "dismissed")}
                    disabled={isUpdating}
                  >
                    Dismiss Report
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Admin Response</h4>
                  <Textarea
                    placeholder="Provide your response or resolution details..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isUpdating}
                  />
                  <Button 
                    className="mt-2" 
                    onClick={() => handleAdminResponse(selectedReport.id)}
                    disabled={!adminResponse.trim() || isUpdating}
                  >
                    {isUpdating ? "Submitting..." : "Submit Response"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}