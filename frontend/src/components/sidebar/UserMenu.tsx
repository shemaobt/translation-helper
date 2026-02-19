import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FeedbackForm from "@/components/feedback-form";
import { 
  User as UserIcon, 
  Users,
  ChevronUp, 
  LogOut,
  UserCircle,
  MessageSquare,
  UserCheck,
  FileText
} from "lucide-react";
import type { User } from "@shared/schema";

interface UserMenuProps {
  user: User | null;
  isAdmin: boolean;
  isMobile: boolean;
  pendingUsersCount: number;
  unreadFeedbackCount: number;
  onLogout: () => void;
}

export function UserMenu({ 
  user, 
  isAdmin, 
  isMobile, 
  pendingUsersCount, 
  unreadFeedbackCount, 
  onLogout 
}: UserMenuProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="mt-auto p-3 md:p-4 border-t border-border">
      <Button
        variant="ghost" 
        className={`flex items-center space-x-2 md:space-x-3 p-2 rounded-md hover:bg-accent w-full justify-start ${isMobile ? 'h-10 sm:h-12' : 'h-10'}`}
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        aria-expanded={userMenuOpen}
        aria-label="User menu"
        data-testid="button-user-menu"
      >
        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt="Profile" 
              className="h-8 w-8 rounded-full object-cover"
              data-testid="img-user-avatar"
            />
          ) : (
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
            {user?.firstName || user?.lastName 
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : user?.email || "User"
            }
          </p>
          <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
            {user?.email || ""}
          </p>
        </div>
        <ChevronUp className={`h-3 w-3 text-muted-foreground transition-transform ${userMenuOpen ? "" : "rotate-180"}`} />
      </Button>
      
      {userMenuOpen && (
        <div className="mt-2 bg-popover border border-border rounded-md shadow-lg py-2 max-h-96 overflow-y-auto">
          <Link href="/profile" className="block">
            <Button
              variant="ghost"
              className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
              onClick={() => setUserMenuOpen(false)}
              data-testid="link-profile"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Profile Settings
            </Button>
          </Link>
          
          {isAdmin && (
            <>
              <Separator className="my-1" />
              <Link href="/admin/users" className="block">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
                  onClick={() => setUserMenuOpen(false)}
                  data-testid="link-admin-users"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">User Management</span>
                  {pendingUsersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 min-w-[1.25rem] text-xs px-1.5 py-0 rounded-full flex items-center justify-center"
                      data-testid="badge-pending-users"
                    >
                      {pendingUsersCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/admin/feedback" className="block">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
                  onClick={() => setUserMenuOpen(false)}
                  data-testid="link-admin-feedback"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">Manage Feedback</span>
                  {unreadFeedbackCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 min-w-[1.25rem] text-xs px-1.5 py-0 rounded-full flex items-center justify-center"
                      data-testid="badge-unread-feedback"
                    >
                      {unreadFeedbackCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/admin/prompts" className="block">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
                  onClick={() => setUserMenuOpen(false)}
                  data-testid="link-admin-prompts"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">Prompt Management</span>
                </Button>
              </Link>
              <Separator className="my-1" />
            </>
          )}
          <FeedbackForm
            trigger={
              <Button
                variant="ghost"
                className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
                data-testid="button-feedback"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Feedback
              </Button>
            }
          />
          
          <Separator className="my-1" />
          
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
            onClick={() => {
              onLogout();
              setUserMenuOpen(false);
            }}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      )}
    </div>
  );
}
