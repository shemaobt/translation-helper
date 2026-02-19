import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import { FeedbackFilters, FeedbackCard } from "@/components/admin";
import { MessageSquare } from "lucide-react";
import type { Feedback } from "@shared/schema";

export default function AdminFeedback() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
      toast({ title: "Success", description: "Feedback status updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update feedback status", variant: "destructive" });
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
      toast({ title: "Success", description: "Feedback deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete feedback", variant: "destructive" });
    },
  });

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const statusMatch = statusFilter === "all" || feedback.status === statusFilter;
    const categoryMatch = categoryFilter === "all" || feedback.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const handleClearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateFeedbackStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteFeedbackMutation.mutate(id);
  };

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
    <div className="h-screen bg-background flex relative overflow-hidden" data-testid="page-admin-feedback">
      <div className="relative h-full w-64 flex-shrink-0">
        <Sidebar isMobile={isMobile} isOpen={true} />
      </div>
      
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-8'} overflow-auto`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
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
            </div>
          </div>

          <FeedbackFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onClearFilters={handleClearFilters}
            isMobile={isMobile}
          />

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
                    <FeedbackCard
                      key={feedback.id}
                      feedback={feedback}
                      onUpdateStatus={handleUpdateStatus}
                      onDelete={handleDelete}
                    />
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
