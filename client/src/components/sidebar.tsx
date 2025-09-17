import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import FeedbackForm from "./feedback-form";
import { 
  Plus, 
  MoreHorizontal, 
  User as UserIcon, 
  Users,
  ChevronUp, 
  ChevronDown,
  BarChart3, 
  Key, 
  Settings, 
  LogOut,
  MessageSquare,
  X,
  Trash,
  UserCheck,
  Shield
} from "lucide-react";
// Use logo from public directory
const logoImage = "/logo.png";
import type { Chat, AssistantId } from "@shared/schema";
import { ASSISTANTS } from "@shared/schema";

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  selectedAssistant?: AssistantId;
  onAssistantChange?: (assistantId: AssistantId) => void;
}

export default function Sidebar({ 
  isMobile = false, 
  isOpen = true, 
  onClose, 
  selectedAssistant = 'storyteller',
  onAssistantChange 
}: SidebarProps = {}) {
  const [location, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin (only admin can see dashboard, settings, etc.)
  // Properly type the user object for admin check
  const userWithAdmin = user as any;
  const isAdmin = userWithAdmin?.isAdmin === true;
  
  // Debug logging for admin status (only in development)
  if (import.meta.env.DEV) {
    console.log(`[Sidebar] User: ${userWithAdmin?.email}, isAdmin: ${isAdmin}, raw user object:`, user);
  }

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    retry: false,
  });

  // Fetch unread feedback count for admin users
  const { data: unreadFeedbackCount = 0 } = useQuery<number>({
    queryKey: ["/api/admin/feedback/unread-count"],
    enabled: isAdmin,
    retry: false,
    select: (data: any) => data?.count || 0,
  });

  const createChatMutation = useMutation({
    mutationFn: async (assistantId: AssistantId) => {
      const response = await apiRequest("POST", "/api/chats", {
        title: "New Chat",
        assistantId: assistantId,
      });
      return response.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setLocation(`/chat/${newChat.id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await apiRequest("DELETE", `/api/chats/${chatId}`);
      return response.json();
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      // Remove cached data for the deleted chat instead of trying to refetch it
      queryClient.removeQueries({ queryKey: ["/api/chats", deletedChatId] });
      queryClient.removeQueries({ queryKey: ["/api/chats", deletedChatId, "messages"] });
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
      // Only navigate away if we're currently viewing the deleted chat
      const currentPath = window.location.pathname;
      if (currentPath === `/chat/${deletedChatId}`) {
        setLocation('/');
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    },
  });

  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "Unknown";
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <div className={`${isMobile ? 'w-full max-w-xs' : 'w-64 md:w-64 lg:w-72'} bg-card border-r border-border flex flex-col h-full`}>
      {/* Header */}
      <div className={`${isMobile ? 'p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))]' : 'p-3 md:p-4'} border-b border-border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src={logoImage} 
                alt="Translation Helper Logo" 
                className="h-8 w-8 object-contain"
                data-testid="img-app-logo"
              />
            </div>
            <span className={`font-semibold text-foreground ${isMobile ? 'text-base sm:text-lg' : 'text-sm md:text-base'}`}>Translation Helper</span>
          </div>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`${isMobile ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-8 w-8'} p-0 touch-manipulation`}
              data-testid="button-close-sidebar"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* New Chat Dropdown */}
      <div className="p-3 md:p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={`w-full justify-center space-x-2 ${isMobile ? 'h-10 sm:h-12 text-sm sm:text-base touch-manipulation' : 'h-9 md:h-10'}`}
              disabled={createChatMutation.isPending}
              data-testid="button-new-chat"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 max-h-64 overflow-y-auto">
            {Object.values(ASSISTANTS).map((assistant) => (
              <DropdownMenuItem 
                key={assistant.id}
                onClick={() => createChatMutation.mutate(assistant.id as AssistantId)}
                disabled={createChatMutation.isPending}
                className="p-3"
                data-testid={`new-chat-assistant-${assistant.id}`}
              >
                <div>
                  <div className="font-medium">{assistant.name}</div>
                  <div className="text-sm text-muted-foreground">{assistant.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 md:space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Chats</h3>
        
        {chats.map((chat) => (
          <div key={chat.id} className="relative group">
            <Link
              href={`/chat/${chat.id}`}
              className="block p-2 md:p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
              data-testid={`link-chat-${chat.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm text-foreground truncate" data-testid={`text-chat-title-${chat.id}`}>
                    {chat.title}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-chat-timestamp-${chat.id}`}>
                    {formatTimestamp(chat.updatedAt || chat.createdAt || "")}
                  </p>
                </div>
              </div>
            </Link>
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={isMobile ? 'opacity-100 h-8 w-8 p-0 touch-manipulation' : 'opacity-0 group-hover:opacity-100 h-auto p-1'}
                    data-testid={`button-chat-menu-${chat.id}`}
                    aria-label="Chat options"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteChatMutation.mutate(chat.id);
                    }}
                    data-testid={`button-delete-chat-${chat.id}`}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {chats.length === 0 && (
          <div className="text-center py-6 md:py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No chats yet</p>
            <p className="text-xs text-muted-foreground">Start a new conversation</p>
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="p-3 md:p-4 border-t border-border">
        <Button
          variant="ghost" 
          className={`flex items-center space-x-2 md:space-x-3 p-2 rounded-md hover:bg-accent w-full justify-start ${isMobile ? 'h-10 sm:h-12' : 'h-10'}`}
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          aria-expanded={userMenuOpen}
          aria-label="User menu"
          data-testid="button-user-menu"
        >
          <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
            {(user as any)?.profileImageUrl ? (
              <img 
                src={(user as any).profileImageUrl} 
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
              {(user as any)?.firstName || (user as any)?.lastName 
                ? `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim()
                : (user as any)?.email || "User"
              }
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {(user as any)?.email || ""}
            </p>
          </div>
          <ChevronUp className={`h-3 w-3 text-muted-foreground transition-transform ${userMenuOpen ? "" : "rotate-180"}`} />
        </Button>
        
        {/* Dropdown Menu */}
        {userMenuOpen && (
          <div className="mt-2 bg-popover border border-border rounded-md shadow-lg py-2 max-h-96 overflow-y-auto">
            {/* Admin-only options */}
            {isAdmin && (
              <>
                <Link href="/dashboard" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
                    data-testid="link-dashboard"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/users" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
                    data-testid="link-admin-users"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    User Management
                  </Button>
                </Link>
                <Link href="/admin/feedback" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-3 md:px-4 ${isMobile ? 'h-10 sm:h-12' : 'py-2 h-auto'}`}
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
                <Separator className="my-1" />
              </>
            )}
            {/* Feedback option (visible to all users) */}
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
            
            {/* Logout option (visible to all users) */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
              onClick={() => {
                logout();
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
    </div>
  );
}
