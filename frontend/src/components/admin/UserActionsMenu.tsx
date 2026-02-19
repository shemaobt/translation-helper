import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldOff,
  KeyRound,
  UserCheck,
  UserX
} from "lucide-react";
import type { UserWithStats } from "@/types";

interface UserActionsMenuProps {
  user: UserWithStats;
  isMobile: boolean;
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

export function UserActionsMenu({
  user,
  isMobile,
  onToggleAdmin,
  onResetPassword,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  isToggleAdminPending,
  isResetPasswordPending,
  isApprovePending,
  isRejectPending,
}: UserActionsMenuProps) {
  return (
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
          onClick={() => onToggleAdmin(user.id)}
          disabled={isToggleAdminPending}
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
          onClick={() => onResetPassword(user.id)}
          disabled={isResetPasswordPending}
          data-testid={`button-reset-password-${user.id}`}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Reset Password
        </DropdownMenuItem>
        
        {user.approvalStatus === 'pending' && (
          <>
            <DropdownMenuItem
              onClick={() => onApproveUser(user.id)}
              disabled={isApprovePending}
              className="text-green-600 focus:text-green-600"
              data-testid={`button-approve-user-${user.id}`}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Approve User
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRejectUser(user.id)}
              disabled={isRejectPending}
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
                onClick={() => onDeleteUser(user.id)}
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
  );
}
