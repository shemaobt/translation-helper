import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
import { 
  Bot, 
  Plus, 
  MoreHorizontal, 
  User, 
  ChevronUp, 
  BarChart3, 
  Key, 
  Settings, 
  LogOut,
  MessageSquare,
  X,
  Trash 
} from "lucide-react";
import type { Chat, AssistantId } from "@shared/schema";

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

  // Check if user is manager (only manager can see dashboard, settings, etc.)
  const isManager = (user as any)?.email === 'lucashandreus@gmail.com';

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    retry: false,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats", {
        title: "New Chat",
        assistantId: selectedAssistant,
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
      queryClient.invalidateQueries({ queryKey: ["/api/chats", deletedChatId] });
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
    <div className={`${isMobile ? 'w-full max-w-sm' : 'w-64'} bg-card border-r border-border flex flex-col h-full`}>
      {/* Header */}
      <div className={`${isMobile ? 'p-4 pt-[max(1rem,env(safe-area-inset-top))]' : 'p-4'} border-b border-border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className={`font-semibold text-foreground ${isMobile ? 'text-lg' : ''}`}>Translation Helper</span>
          </div>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`${isMobile ? 'h-12 w-12' : 'h-8 w-8'} p-0 touch-manipulation`}
              data-testid="button-close-sidebar"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          className={`w-full justify-center space-x-2 ${isMobile ? 'h-12 text-base touch-manipulation' : ''}`}
          onClick={() => createChatMutation.mutate()}
          disabled={createChatMutation.isPending}
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Chats</h3>
        
        {chats.map((chat) => (
          <div key={chat.id} className="relative group">
            <Link
              href={`/chat/${chat.id}`}
              className="block p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
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
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No chats yet</p>
            <p className="text-xs text-muted-foreground">Start a new conversation</p>
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost" 
          className={`flex items-center space-x-3 p-2 rounded-md hover:bg-accent w-full justify-start ${isMobile ? 'h-12' : ''}`}
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
              <User className="h-4 w-4 text-muted-foreground" />
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
          <div className="mt-2 bg-popover border border-border rounded-md shadow-lg py-2">
            {/* Manager-only options */}
            {isManager && (
              <>
                <Link href="/dashboard" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
                    data-testid="link-dashboard"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/api-keys" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
                    data-testid="link-api-keys"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    API Keys
                  </Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm px-4 ${isMobile ? 'h-12' : 'py-2 h-auto'}`}
                    data-testid="link-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <Separator className="my-1" />
              </>
            )}
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
