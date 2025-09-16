import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Sidebar from "@/components/sidebar";
import { 
  MessageSquare, 
  MoreHorizontal, 
  Trash2, 
  Filter,
  Mail,
  User,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  Eye,
  AlertCircle
} from "lucide-react";
import type { Feedback } from "@shared/schema";

export default function AdminFeedback() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Ensure sidebar is closed when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: feedbacks = [], isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    retry: false,
  });

  const updateFeedbackStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/feedback/${id}`, 
        { status },
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback/unread-count"] });
      toast({
        title: "Success",
        description: "Feedback status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update feedback status",
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/feedback/${id}`, 
        undefined,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback/unread-count"] });
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <Circle className="h-4 w-4" />;
      case "read":
        return <Eye className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "read":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case "bug":
        return <AlertCircle className="h-3 w-3" />;
      case "feature":
        return <Tag className="h-3 w-3" />;
      case "general":
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "Unknown";
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  // Filter feedbacks based on selected filters
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const statusMatch = statusFilter === "all" || feedback.status === statusFilter;
    const categoryMatch = categoryFilter === "all" || feedback.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex relative" data-testid="page-admin-feedback">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'relative'
        }
      `}>
        <Sidebar 
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          {/* Header */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
                  Admin Feedback
                </h1>
                <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
                  Manage user feedback and support requests
                </p>
              </div>
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  data-testid="button-open-sidebar"
                >
                  Menu
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setCategoryFilter("all");
                    }}
                    className="w-full"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Feedback Submissions ({filteredFeedbacks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No feedback found</p>
                  <p className="text-xs text-muted-foreground">
                    {feedbacks.length === 0 ? "No feedback has been submitted yet" : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedbacks.map((feedback) => (
                    <Card key={feedback.id} className="relative" data-testid={`card-feedback-${feedback.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Header with status and category */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge 
                                className={`flex items-center gap-1 ${getStatusColor(feedback.status)}`}
                                data-testid={`badge-status-${feedback.id}`}
                              >
                                {getStatusIcon(feedback.status)}
                                {feedback.status?.charAt(0).toUpperCase() + feedback.status?.slice(1)}
                              </Badge>
                              {feedback.category && (
                                <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-category-${feedback.id}`}>
                                  {getCategoryIcon(feedback.category)}
                                  {feedback.category?.charAt(0).toUpperCase() + feedback.category?.slice(1)}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatTimestamp(feedback.createdAt)}
                              </span>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                              <p className="text-sm text-foreground whitespace-pre-wrap" data-testid={`text-message-${feedback.id}`}>
                                {feedback.message}
                              </p>
                            </div>

                            {/* User info */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {feedback.userName && (
                                <span className="flex items-center gap-1" data-testid={`text-user-name-${feedback.id}`}>
                                  <User className="h-3 w-3" />
                                  {feedback.userName}
                                </span>
                              )}
                              {feedback.userEmail && (
                                <span className="flex items-center gap-1" data-testid={`text-user-email-${feedback.id}`}>
                                  <Mail className="h-3 w-3" />
                                  {feedback.userEmail}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Status Update Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-status-menu-${feedback.id}`}
                                >
                                  Update Status
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => updateFeedbackStatusMutation.mutate({ id: feedback.id, status: "new" })}
                                  disabled={feedback.status === "new"}
                                  data-testid={`button-status-new-${feedback.id}`}
                                >
                                  <Circle className="mr-2 h-4 w-4" />
                                  Mark as New
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateFeedbackStatusMutation.mutate({ id: feedback.id, status: "read" })}
                                  disabled={feedback.status === "read"}
                                  data-testid={`button-status-read-${feedback.id}`}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Mark as Read
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateFeedbackStatusMutation.mutate({ id: feedback.id, status: "resolved" })}
                                  disabled={feedback.status === "resolved"}
                                  data-testid={`button-status-resolved-${feedback.id}`}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Mark as Resolved
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Delete Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${feedback.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this feedback? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${feedback.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteFeedbackMutation.mutate(feedback.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${feedback.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}