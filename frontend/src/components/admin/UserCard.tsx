import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { UserStatsPanel } from "./UserStatsPanel";
import { UserActionsMenu } from "./UserActionsMenu";
import type { UserWithStats } from "@/types";

interface UserCardProps {
  user: UserWithStats;
  isMobile: boolean;
  formatName: (user: UserWithStats) => string;
  formatTimestamp: (timestamp: string | Date | null | undefined) => string;
  onToggleAdmin: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  isToggleAdminPending: boolean;
  isResetPasswordPending: boolean;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

export function UserCard({
  user,
  isMobile,
  formatName,
  formatTimestamp,
  onToggleAdmin,
  onResetPassword,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  isToggleAdminPending,
  isResetPasswordPending,
  isApprovePending,
  isRejectPending,
}: UserCardProps) {
  return (
    <Card className="relative" data-testid={`card-user-${user.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
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

            <UserStatsPanel stats={user.stats} userId={user.id} isMobile={isMobile} />
          </div>
          
          <div className="ml-4">
            <UserActionsMenu
              user={user}
              isMobile={isMobile}
              onToggleAdmin={onToggleAdmin}
              onResetPassword={onResetPassword}
              onApproveUser={onApproveUser}
              onRejectUser={onRejectUser}
              onDeleteUser={onDeleteUser}
              isToggleAdminPending={isToggleAdminPending}
              isResetPasswordPending={isResetPasswordPending}
              isApprovePending={isApprovePending}
              isRejectPending={isRejectPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
