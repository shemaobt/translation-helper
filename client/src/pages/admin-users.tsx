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
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Sidebar from "@/components/sidebar";
import { 
  Users, 
  MoreHorizontal, 
  Trash2, 
  Filter,
  Mail,
  User,
  Calendar,
  Shield,
  ShieldOff,
  KeyRound,
  Search,
  SortAsc,
  SortDesc,
  Activity,
  MessageSquare,
  Key,
  BarChart3,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX
} from "lucide-react";

interface UserWithStats {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastLoginAt: string | Date | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
  approvedAt?: string | Date | null;
  approvedBy?: string | null;
  stats: {
    totalChats: number;
    totalMessages: number;
    totalApiKeys: number;
    totalApiCalls: number;
  };
}

export default function AdminUsers() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  // Sidebar is always visible, no toggle state needed
  
  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Dialog states
  const [passwordResetDialog, setPasswordResetDialog] = useState<{ open: boolean; user?: UserWithStats; password?: string }>({ open: false });
  const [copied, setCopied] = useState(false);

  // Redirect to login if not authenticated, to dashboard if not admin
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
    
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
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
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    enabled: isAuthenticated && user?.isAdmin === true,
  });

  // Handle query errors with useEffect
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
      
      // Handle 403 Forbidden (not admin)
      if ((usersError as any)?.status === 403) {
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
      toast({
        title: "Success",
        description: "User admin status updated successfully",
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
        description: "Failed to update user admin status",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "User deleted successfully",
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
        description: "Failed to delete user",
        variant: "destructive",
      });
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
      // Show the password reset dialog with the temporary password
      // Use data from API response instead of searching in local state
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
      setPasswordResetDialog({ 
        open: true, 
        user: dialogUser,
        password: data.temporaryPassword 
      });
      toast({
        title: "Success",
        description: "User password reset successfully",
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
        description: "Failed to reset user password",
        variant: "destructive",
      });
    },
  });

  // Approval management mutations
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
      toast({
        title: "Success",
        description: "User approved successfully",
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
        description: "Failed to approve user",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "User rejected successfully",
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
        description: "Failed to reject user",
        variant: "destructive",
      });
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Temporary password copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy password",
        variant: "destructive",
      });
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = (users as UserWithStats[])
    .filter((user: UserWithStats) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.email.toLowerCase().includes(searchLower) ||
        formatName(user).toLowerCase().includes(searchLower);
      
      // Admin filter
      const matchesAdminFilter = 
        adminFilter === "all" ||
        (adminFilter === "admin" && user.isAdmin) ||
        (adminFilter === "user" && !user.isAdmin);
      
      // Approval status filter
      const matchesApprovalFilter = 
        approvalFilter === "all" ||
        (approvalFilter === "pending" && user.approvalStatus === "pending") ||
        (approvalFilter === "approved" && (user.approvalStatus === "approved" || user.approvalStatus === null)) ||
        (approvalFilter === "rejected" && user.approvalStatus === "rejected");
      
      return matchesSearch && matchesAdminFilter && matchesApprovalFilter;
    })
    .sort((a: UserWithStats, b: UserWithStats) => {
      let aValue: any, bValue: any;
      
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
          aValue = a.createdAt;
          bValue = b.createdAt;
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
      {/* Sidebar - Always visible */}
      <div className="relative h-full w-64 flex-shrink-0">
        <Sidebar 
          isMobile={isMobile}
          isOpen={true}
        />
      </div>
      
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-8'} overflow-auto`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          {/* Header */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
                  User Management
                </h1>
                <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
                  Manage user accounts, permissions, and view usage statistics
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters & Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 lg:grid-cols-4 gap-4'}`}>
                {/* Search */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-10 ${isMobile ? 'min-h-12' : ''}`}
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
                
                {/* Admin Filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">User Type</label>
                  <Select value={adminFilter} onValueChange={setAdminFilter}>
                    <SelectTrigger className={isMobile ? 'min-h-12' : ''} data-testid="select-admin-filter">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="admin">Admins only</SelectItem>
                      <SelectItem value="user">Regular users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Approval Status Filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Approval Status</label>
                  <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                    <SelectTrigger className={isMobile ? 'min-h-12' : ''} data-testid="select-approval-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort By */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className={isMobile ? 'min-h-12' : ''} data-testid="select-sort-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Registration Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="lastLoginAt">Last Login</SelectItem>
                      <SelectItem value="totalChats">Total Chats</SelectItem>
                      <SelectItem value="totalMessages">Total Messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort Order */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Order</label>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className={`w-full justify-start ${isMobile ? 'min-h-12' : ''}`}
                    data-testid="button-sort-order"
                  >
                    {sortOrder === "asc" ? <SortAsc className="mr-2 h-4 w-4" /> : <SortDesc className="mr-2 h-4 w-4" />}
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setAdminFilter("all");
                    setApprovalFilter("all");
                    setSortBy("createdAt");
                    setSortOrder("desc");
                  }}
                  className={isMobile ? 'min-h-12' : ''}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedUsers.length} of {(users as UserWithStats[]).length} users
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
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
                    {(users as UserWithStats[]).length === 0 ? "No users exist yet" : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedUsers.map((user: UserWithStats) => (
                    <Card key={user.id} className="relative" data-testid={`card-user-${user.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Header with name, email and admin badge */}
                            <div className="flex items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground" data-testid={`text-user-name-${user.id}`}>
                                    {formatName(user)}
                                  </h3>
                                  {user.isAdmin && (
                                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" data-testid={`badge-admin-${user.id}`}>
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </Badge>
                                  )}
                                  {/* Approval Status Badge */}
                                  {user.approvalStatus === 'pending' && (
                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" data-testid={`badge-pending-${user.id}`}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                  {user.approvalStatus === 'rejected' && (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" data-testid={`badge-rejected-${user.id}`}>
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Rejected
                                    </Badge>
                                  )}
                                  {(user.approvalStatus === 'approved' || user.approvalStatus === null) && (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" data-testid={`badge-approved-${user.id}`}>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approved
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-user-email-${user.id}`}>
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>

                            {/* User Information */}
                            <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Registered: </span>
                                  <span className="text-foreground" data-testid={`text-user-created-${user.id}`}>
                                    {formatTimestamp(user.createdAt)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-muted-foreground">Last Login: </span>
                                  <span className="text-foreground" data-testid={`text-user-last-login-${user.id}`}>
                                    {formatTimestamp(user.lastLoginAt)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Usage Statistics */}
                            <div className="bg-muted/30 rounded-lg p-4">
                              <h4 className="font-medium text-foreground mb-3">Usage Statistics</h4>
                              <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-chats-${user.id}`}>
                                    <MessageSquare className="h-5 w-5" />
                                    {user.stats.totalChats}
                                  </div>
                                  <p className="text-xs text-muted-foreground">Chats</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-messages-${user.id}`}>
                                    <BarChart3 className="h-5 w-5" />
                                    {user.stats.totalMessages}
                                  </div>
                                  <p className="text-xs text-muted-foreground">Messages</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-api-keys-${user.id}`}>
                                    <Key className="h-5 w-5" />
                                    {user.stats.totalApiKeys}
                                  </div>
                                  <p className="text-xs text-muted-foreground">API Keys</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-api-calls-${user.id}`}>
                                    <Activity className="h-5 w-5" />
                                    {user.stats.totalApiCalls}
                                  </div>
                                  <p className="text-xs text-muted-foreground">API Calls</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions Menu */}
                          <div className="ml-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={isMobile ? 'h-8 w-8 p-0 touch-manipulation' : 'h-8 w-8 p-0'}
                                  data-testid={`button-user-menu-${user.id}`}
                                  aria-label="User options"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => toggleAdminStatusMutation.mutate(user.id)}
                                  disabled={toggleAdminStatusMutation.isPending}
                                  data-testid={`button-toggle-admin-${user.id}`}
                                >
                                  {user.isAdmin ? (
                                    <>
                                      <ShieldOff className="mr-2 h-4 w-4" />
                                      Remove Admin
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="mr-2 h-4 w-4" />
                                      Make Admin
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => resetPasswordMutation.mutate(user.id)}
                                  disabled={resetPasswordMutation.isPending}
                                  data-testid={`button-reset-password-${user.id}`}
                                >
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                
                                {/* Approval Actions - Only show for pending users */}
                                {user.approvalStatus === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => approveUserMutation.mutate(user.id)}
                                      disabled={approveUserMutation.isPending}
                                      className="text-green-600 focus:text-green-600"
                                      data-testid={`button-approve-user-${user.id}`}
                                    >
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Approve User
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => rejectUserMutation.mutate(user.id)}
                                      disabled={rejectUserMutation.isPending}
                                      className="text-red-600 focus:text-red-600"
                                      data-testid={`button-reject-user-${user.id}`}
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Reject User
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive"
                                      onSelect={(e) => e.preventDefault()}
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this user account? This will permanently remove:
                                        <br />• User profile and authentication
                                        <br />• All chat conversations ({user.stats.totalChats} chats)
                                        <br />• All messages ({user.stats.totalMessages} messages)
                                        <br />• All API keys ({user.stats.totalApiKeys} keys)
                                        <br />• All usage data ({user.stats.totalApiCalls} API calls)
                                        <br /><br />This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteUserMutation.mutate(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        data-testid={`button-confirm-delete-${user.id}`}
                                      >
                                        Delete User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialog.open} onOpenChange={(open) => setPasswordResetDialog({ ...passwordResetDialog, open })}>
        <DialogContent data-testid="dialog-password-reset">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              The password has been reset for {passwordResetDialog.user ? formatName(passwordResetDialog.user) : ""}. 
              Please provide the user with this temporary password:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm font-medium">Temporary Password</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input 
                  type="text" 
                  value={passwordResetDialog.password || ""} 
                  readOnly 
                  className="font-mono"
                  data-testid="input-temp-password"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => passwordResetDialog.password && copyToClipboard(passwordResetDialog.password)}
                  data-testid="button-copy-password"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Important:</strong> The user should change this password immediately after logging in. 
              This temporary password will be shown only once.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setPasswordResetDialog({ open: false })} data-testid="button-close-password-dialog">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}