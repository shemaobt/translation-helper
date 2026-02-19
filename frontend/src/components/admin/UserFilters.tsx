import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search, SortAsc, SortDesc } from "lucide-react";

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  adminFilter: string;
  onAdminFilterChange: (value: string) => void;
  approvalFilter: string;
  onApprovalFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: () => void;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
  isMobile: boolean;
}

export function UserFilters({
  searchQuery,
  onSearchChange,
  adminFilter,
  onAdminFilterChange,
  approvalFilter,
  onApprovalFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
  filteredCount,
  totalCount,
  isMobile,
}: UserFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filters &amp; Search</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 lg:grid-cols-4 gap-4'}`}>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`pl-10 ${isMobile ? 'min-h-12' : ''}`}
                data-testid="input-search-users"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">User Type</label>
            <Select value={adminFilter} onValueChange={onAdminFilterChange}>
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
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Approval Status</label>
            <Select value={approvalFilter} onValueChange={onApprovalFilterChange}>
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
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Sort By</label>
            <Select value={sortBy} onValueChange={onSortByChange}>
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
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Order</label>
            <Button
              variant="outline"
              onClick={onSortOrderChange}
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
            onClick={onClearFilters}
            className={isMobile ? 'min-h-12' : ''}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
          <div className="text-sm text-muted-foreground">
            Showing {filteredCount} of {totalCount} users
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
