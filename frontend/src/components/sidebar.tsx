import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { SidebarHeader, NewChatButton, ChatList, UserMenu } from "./sidebar/index";
import type { Chat, AssistantId } from "@shared/schema";
import type { CountResponse } from "@/types";

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
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.isAdmin === true;

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
    retry: false,
  });

  const { data: unreadFeedbackCount = 0 } = useQuery<CountResponse, Error, number>({
    queryKey: ["/api/admin/feedback/unread-count"],
    enabled: isAdmin,
    retry: false,
    select: (data) => data?.count ?? 0,
  });

  const { data: pendingUsersCount = 0 } = useQuery<CountResponse, Error, number>({
    queryKey: ["/api/admin/users/pending-count"],
    enabled: isAdmin,
    retry: false,
    select: (data) => data?.count ?? 0,
  });

  useEffect(() => {
    if (isAdmin && pendingUsersCount > 0) {
      toast({
        title: "Pending User Approvals",
        description: `You have ${pendingUsersCount} user${pendingUsersCount > 1 ? 's' : ''} awaiting approval. Click User Management to review.`,
        variant: "default",
      });
    }
  }, [pendingUsersCount, isAdmin, toast]);

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
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create new chat", variant: "destructive" });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await apiRequest("DELETE", `/api/chats/${chatId}`);
      return response.json();
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.removeQueries({ queryKey: ["/api/chats", deletedChatId] });
      queryClient.removeQueries({ queryKey: ["/api/chats", deletedChatId, "messages"] });
      toast({ title: "Success", description: "Chat deleted successfully" });
      const currentPath = window.location.pathname;
      if (currentPath === `/chat/${deletedChatId}`) {
        setLocation('/');
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete chat", variant: "destructive" });
    },
  });

  return (
    <div className={`w-full ${isMobile ? 'max-w-xs phone-xs:max-w-full phone-sm:max-w-sm' : ''} bg-card ${!isMobile ? 'border-r border-border' : ''} flex flex-col h-full`}>
      <SidebarHeader isMobile={isMobile} onClose={onClose} />
      
      <NewChatButton 
        isMobile={isMobile} 
        isPending={createChatMutation.isPending} 
        onCreateChat={(assistantId) => createChatMutation.mutate(assistantId)} 
      />
      
      <ChatList 
        chats={chats} 
        isMobile={isMobile} 
        onDeleteChat={(chatId) => deleteChatMutation.mutate(chatId)} 
      />
      
      <UserMenu 
        user={user} 
        isAdmin={isAdmin} 
        isMobile={isMobile} 
        pendingUsersCount={pendingUsersCount} 
        unreadFeedbackCount={unreadFeedbackCount} 
        onLogout={logout} 
      />
    </div>
  );
}
