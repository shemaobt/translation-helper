import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import { UserFilters, UserCard, PasswordResetDialog } from "@/components/admin";
import { Users } from "lucide-react";
import type { UserWithStats, SortValue, QueryError } from "@/types";

export default function AdminUsers() {
  const { user, isAuthenticated, isLoading, canAccess } = useAdminGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [passwordResetDialog, setPasswordResetDialog] = useState<{ open: boolean; user?: UserWithStats; password?: string }>({ open: false });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    enabled: canAccess,
  });

  useEffect(() => {
    if (usersError) {
      if (isUnauthorizedError(usersError)) {
        toast({
          title: "Session Expired",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      
      const errorWithStatus = usersError as QueryError;
      if (errorWithStatus?.status === 403) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required. Redirecting to dashboard...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    }
  }, [usersError, toast]);

  const toggleAdminStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/admin`, 
        {},
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User admin status updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update user admin status", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`, 
        undefined,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, 
        {},
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      const dialogUser: UserWithStats = users.find((u: UserWithStats) => u.id === data.id) || {
        id: data.id,
        email: data.email || 'Unknown user',
        firstName: null,
        lastName: null,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        stats: { totalChats: 0, totalMessages: 0, totalApiKeys: 0, totalApiCalls: 0 }
      };
      setPasswordResetDialog({ open: true, user: dialogUser, password: data.temporaryPassword });
      toast({ title: "Success", description: "User password reset successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to reset user password", variant: "destructive" });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/approve`, 
        {},
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User approved successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to approve user", variant: "destructive" });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reject`, 
        {},
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User rejected successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to reject user", variant: "destructive" });
    },
  });

  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "Never";
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  const formatName = (user: UserWithStats) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return name || "No name set";
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setAdminFilter("all");
    setApprovalFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const filteredAndSortedUsers = (users as UserWithStats[])
    .filter((user: UserWithStats) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.email.toLowerCase().includes(searchLower) ||
        formatName(user).toLowerCase().includes(searchLower);
      
      const matchesAdminFilter = 
        adminFilter === "all" ||
        (adminFilter === "admin" && user.isAdmin) ||
        (adminFilter === "user" && !user.isAdmin);
      
      const matchesApprovalFilter = 
        approvalFilter === "all" ||
        (approvalFilter === "pending" && user.approvalStatus === "pending") ||
        (approvalFilter === "approved" && (user.approvalStatus === "approved" || user.approvalStatus === null)) ||
        (approvalFilter === "rejected" && user.approvalStatus === "rejected");
      
      return matchesSearch && matchesAdminFilter && matchesApprovalFilter;
    })
    .sort((a: UserWithStats, b: UserWithStats) => {
      let aValue: SortValue, bValue: SortValue;
      
      switch (sortBy) {
        case "name":
          aValue = formatName(a).toLowerCase();
          bValue = formatName(b).toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "lastLoginAt":
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt) : new Date(0);
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt) : new Date(0);
          break;
        case "totalChats":
          aValue = a.stats.totalChats;
          bValue = b.stats.totalChats;
          break;
        case "totalMessages":
          aValue = a.stats.totalMessages;
          bValue = b.stats.totalMessages;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && !user.isAdmin)) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex relative overflow-hidden" data-testid="page-admin-users">
      <div className="relative h-full w-64 flex-shrink-0">
        <Sidebar isMobile={isMobile} isOpen={true} />
      </div>
      
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-8'} overflow-auto`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
              User Management
            </h1>
            <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
              Manage user accounts, permissions, and view usage statistics
            </p>
          </div>

          <UserFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            adminFilter={adminFilter}
            onAdminFilterChange={setAdminFilter}
            approvalFilter={approvalFilter}
            onApprovalFilterChange={setApprovalFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            onClearFilters={handleClearFilters}
            filteredCount={filteredAndSortedUsers.length}
            totalCount={users.length}
            isMobile={isMobile}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Users ({filteredAndSortedUsers.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                  <p className="text-xs text-muted-foreground">
                    {users.length === 0 ? "No users exist yet" : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedUsers.map((userItem: UserWithStats) => (
                    <UserCard
                      key={userItem.id}
                      user={userItem}
                      isMobile={isMobile}
                      formatName={formatName}
                      formatTimestamp={formatTimestamp}
                      onToggleAdmin={(userId) => toggleAdminStatusMutation.mutate(userId)}
                      onResetPassword={(userId) => resetPasswordMutation.mutate(userId)}
                      onApproveUser={(userId) => approveUserMutation.mutate(userId)}
                      onRejectUser={(userId) => rejectUserMutation.mutate(userId)}
                      onDeleteUser={(userId) => deleteUserMutation.mutate(userId)}
                      isToggleAdminPending={toggleAdminStatusMutation.isPending}
                      isResetPasswordPending={resetPasswordMutation.isPending}
                      isApprovePending={approveUserMutation.isPending}
                      isRejectPending={rejectUserMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PasswordResetDialog
        open={passwordResetDialog.open}
        onOpenChange={(open) => setPasswordResetDialog({ ...passwordResetDialog, open })}
        user={passwordResetDialog.user}
        password={passwordResetDialog.password}
        formatName={formatName}
      />
    </div>
  );
}
