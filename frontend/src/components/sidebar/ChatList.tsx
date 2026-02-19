import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, MessageSquare, Trash } from "lucide-react";
import type { Chat } from "@shared/schema";

interface ChatListProps {
  chats: Chat[];
  isMobile: boolean;
  onDeleteChat: (chatId: string) => void;
}

function formatTimestamp(timestamp: string | Date | null | undefined) {
  if (!timestamp) return "Unknown";
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  if (diffInHours < 48) return "Yesterday";
  return date.toLocaleDateString();
}

export function ChatList({ chats, isMobile, onDeleteChat }: ChatListProps) {
  return (
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
                    onDeleteChat(chat.id);
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
  );
}
