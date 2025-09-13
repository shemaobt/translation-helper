import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  X 
} from "lucide-react";
import type { Chat } from "@shared/schema";

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, isOpen = true, onClose }: SidebarProps = {}) {
  const [location, setLocation] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    retry: false,
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats", {
        title: "New Chat",
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
    <div className={`${isMobile ? 'w-80' : 'w-64'} bg-card border-r border-border flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Translation Helper</span>
          </div>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              data-testid="button-close-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          className="w-full justify-center space-x-2"
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
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className="block"
            data-testid={`link-chat-${chat.id}`}
          >
            <div className="p-3 rounded-md hover:bg-accent cursor-pointer transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate" data-testid={`text-chat-title-${chat.id}`}>
                    {chat.title}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-chat-timestamp-${chat.id}`}>
                    {formatTimestamp(chat.updatedAt || chat.createdAt || "")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-auto p-1"
                  data-testid={`button-chat-menu-${chat.id}`}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Link>
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
        <div 
          className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
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
        </div>
        
        {/* Dropdown Menu */}
        {userMenuOpen && (
          <div className="mt-2 bg-popover border border-border rounded-md shadow-lg py-2">
            <Link href="/dashboard" className="block">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm px-4 py-2 h-auto"
                data-testid="link-dashboard"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/api-keys" className="block">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm px-4 py-2 h-auto"
                data-testid="link-api-keys"
              >
                <Key className="mr-2 h-4 w-4" />
                API Keys
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm px-4 py-2 h-auto"
                data-testid="link-settings"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Separator className="my-1" />
            <Button
              variant="ghost"
              className="w-full justify-start text-sm px-4 py-2 h-auto"
              onClick={() => window.location.href = "/api/logout"}
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
