import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageComponent from "./message";
import { Bot, Trash2, Share, Send, Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Message, Chat, AssistantId } from "@shared/schema";
import { ASSISTANTS } from "@shared/schema";

interface ChatInterfaceProps {
  chatId?: string;
  isMobile?: boolean;
  onOpenSidebar?: () => void;
  defaultAssistant?: AssistantId;
  onDefaultAssistantChange?: (assistantId: AssistantId) => void;
}

const ASSISTANT_CONFIG = ASSISTANTS;

export default function ChatInterface({ 
  chatId, 
  isMobile = false, 
  onOpenSidebar,
  defaultAssistant = 'storyteller',
  onDefaultAssistantChange
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    enabled: !!chatId,
    retry: false,
  });

  // Get current chat details to know which assistant is being used
  const { data: chat } = useQuery<Chat>({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
    retry: false,
  });

  // Derive current assistant: use chat's assistant if available, otherwise default
  const currentAssistant: AssistantId = (chatId ? (chat?.assistantId as AssistantId | undefined) : defaultAssistant) ?? defaultAssistant;

  const switchAssistantMutation = useMutation({
    mutationFn: async (assistantId: AssistantId) => {
      const response = await apiRequest("PATCH", `/api/chats/${chatId}`, { assistantId });
      return { data: await response.json(), assistantId };
    },
    onSuccess: ({ assistantId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Assistant switched",
        description: `Now chatting with ${ASSISTANT_CONFIG[assistantId].name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to switch assistant",
        variant: "destructive",
      });
    },
  });

  const handleAssistantSwitch = (assistantId: AssistantId) => {
    if (!chatId) {
      // For new chats, update the default assistant
      onDefaultAssistantChange?.(assistantId);
      toast({
        title: "Assistant switched",
        description: `Now chatting with ${ASSISTANT_CONFIG[assistantId].name}`,
      });
      return;
    }
    
    // For existing chats, update on the server
    switchAssistantMutation.mutate(assistantId);
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        content,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessage("");
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [message]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex justify-center items-center">
          <div className="max-w-2xl text-center">
            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Translation Helper</h2>
            <p className="text-muted-foreground mb-6">Start a conversation and I'll help you with translations and storytelling.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Choose your assistant:</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`w-full max-w-sm ${isMobile ? 'h-12' : ''}`} data-testid="button-select-assistant">
                    <div className="flex items-center justify-center w-full relative">
                      <div className="text-center">
                        <div className="font-medium">{ASSISTANT_CONFIG[currentAssistant].name}</div>
                        <div className="text-sm text-muted-foreground">{ASSISTANT_CONFIG[currentAssistant].description}</div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-0 flex-shrink-0" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80">
                  {Object.values(ASSISTANT_CONFIG).map((assistant) => (
                    <DropdownMenuItem 
                      key={assistant.id}
                      onClick={() => handleAssistantSwitch(assistant.id as AssistantId)}
                      className="p-3"
                      data-testid={`assistant-option-${assistant.id}-welcome`}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header - Fixed at top */}
      <div className={`bg-card border-b border-border ${isMobile ? 'p-3 pt-[max(0.75rem,env(safe-area-inset-top))]' : 'p-4'} flex items-center justify-between sticky top-0 z-40 shadow-sm`}>
        <div className="flex items-center space-x-3">
          {isMobile && onOpenSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSidebar}
              className={`${isMobile ? 'h-12 w-12' : 'h-8 w-8'} p-0 touch-manipulation`}
              data-testid="button-open-sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`${isMobile ? 'h-12 px-3' : 'h-auto p-0'} hover:bg-transparent justify-start touch-manipulation`}
                  disabled={switchAssistantMutation.isPending}
                  data-testid="button-assistant-switcher"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h1 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground`}>
                        {ASSISTANT_CONFIG[currentAssistant].name}
                      </h1>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                      {ASSISTANT_CONFIG[currentAssistant].description}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {Object.values(ASSISTANT_CONFIG).map((assistant) => (
                  <DropdownMenuItem 
                    key={assistant.id}
                    onClick={() => handleAssistantSwitch(assistant.id as AssistantId)}
                    className="p-3"
                    data-testid={`assistant-option-${assistant.id}`}
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
        </div>
        <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          <Button 
            variant="ghost" 
            size="sm"
            className={`${isMobile ? 'h-12 w-12 p-0 touch-manipulation' : ''}`}
            data-testid="button-clear-chat"
            aria-label="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-share-chat"
              aria-label="Share chat"
            >
              <Share className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 space-y-4' : 'p-4 space-y-6'}`} data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="flex justify-center">
            <div className="max-w-2xl text-center">
              <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Start a conversation</h2>
              <p className="text-muted-foreground">Send a message to begin chatting with your {ASSISTANT_CONFIG[currentAssistant].name}.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageComponent key={msg.id} message={msg} />
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start" data-testid="typing-indicator">
            <div className="max-w-2xl">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-card border border-border rounded-lg rounded-bl-sm p-4">
                  <div className="flex space-x-1">
                    <div className="typing-indicator"></div>
                    <div className="typing-indicator"></div>
                    <div className="typing-indicator"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className={`border-t border-border bg-card sticky bottom-0 z-40 shadow-up ${isMobile ? 'p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'p-4'}`}>
        <form onSubmit={handleSubmit} className={`flex ${isMobile ? 'space-x-2' : 'space-x-3'}`} data-testid="form-message">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={`resize-none ${isMobile ? 'min-h-[44px] max-h-[100px] text-base' : 'min-h-[44px] max-h-[120px]'}`}
              placeholder={isMobile ? "Ask about stories..." : "Type your message..."}
              data-testid="textarea-message"
            />
          </div>
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className={`${isMobile ? 'h-12 w-12 p-0 touch-manipulation shrink-0' : 'h-11'}`}
            data-testid="button-send"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground mt-2 text-center`}>
          {ASSISTANT_CONFIG[currentAssistant].description} powered by {ASSISTANT_CONFIG[currentAssistant].name}
        </p>
      </div>
    </div>
  );
}
