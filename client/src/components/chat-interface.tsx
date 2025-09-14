import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageComponent from "./message";
import { Bot, Trash2, Send, Menu, ChevronDown, Mic, MicOff, Square, Languages } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Language options for speech recognition and synthesis
const LANGUAGE_OPTIONS = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French (France)', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German (Germany)', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian (Italy)', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'ja-JP', name: 'Japanese (Japan)', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean (Korea)', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'hi-IN', name: 'Hindi (India)', flag: '🇮🇳' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', flag: '🇸🇦' },
  { code: 'ru-RU', name: 'Russian (Russia)', flag: '🇷🇺' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)', flag: '🇳🇱' },
  { code: 'sv-SE', name: 'Swedish (Sweden)', flag: '🇸🇪' },
  { code: 'da-DK', name: 'Danish (Denmark)', flag: '🇩🇰' },
];

export default function ChatInterface({ 
  chatId, 
  isMobile = false, 
  onOpenSidebar,
  defaultAssistant = 'storyteller',
  onDefaultAssistantChange
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Speech recognition hook with language support
  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSpeechRecognitionSupported,
    lastError,
    permissionDenied
  } = useSpeechRecognition({ lang: selectedLanguage });
  
  // Speech synthesis hook - expose for message components to use
  const speechSynthesis = useSpeechSynthesis({ lang: selectedLanguage });

  // Show toast for speech recognition errors
  useEffect(() => {
    if (lastError) {
      let errorMessage = 'Speech recognition error occurred';
      
      if (lastError === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions.';
      } else if (lastError === 'no-speech') {
        errorMessage = 'No speech detected. Please try speaking again.';
      } else if (lastError === 'audio-capture') {
        errorMessage = 'Microphone not available. Please check your microphone.';
      } else if (lastError === 'network') {
        errorMessage = 'Network error occurred during speech recognition.';
      }
      
      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [lastError, toast]);

  // Show toast for permission denied
  useEffect(() => {
    if (permissionDenied) {
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  }, [permissionDenied, toast]);

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

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats", {
        title: "New Chat",
        assistantId: currentAssistant,
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
    mutationFn: async () => {
      if (!chatId) {
        throw new Error("No chat ID provided");
      }
      const response = await apiRequest("DELETE", `/api/chats/${chatId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
      // Navigate to home after deleting current chat
      setLocation('/');
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
  
  // Update message when speech recognition provides text
  useEffect(() => {
    if (transcript || interimTranscript) {
      setMessage(transcript + interimTranscript);
    }
  }, [transcript, interimTranscript]);
  
  // Toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
      // Send message if there's transcribed text
      if (message.trim()) {
        handleSubmit(new Event('submit') as any);
      }
    } else {
      resetTranscript();
      setMessage("");
      startListening();
    }
  };

  // Auto-scroll disabled per user request
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages, isTyping]);

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Welcome Header with Menu Button */}
        {isMobile && onOpenSidebar && (
          <div className="p-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSidebar}
              className="h-12 w-12 p-0 touch-manipulation"
              data-testid="button-open-sidebar-welcome"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
        
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

            {/* Start a New Chat Button */}
            <div className="mt-4">
              <Button 
                onClick={() => createChatMutation.mutate()}
                disabled={createChatMutation.isPending}
                className={`w-full max-w-sm ${isMobile ? 'h-12' : ''} bg-primary hover:bg-primary/90 text-primary-foreground`}
                data-testid="button-start-new-chat"
              >
                {createChatMutation.isPending ? "Starting..." : "Start a New Chat"}
              </Button>
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

        <div className="flex items-center space-x-2">
          {/* Language Selector */}
          {(isSpeechRecognitionSupported || speechSynthesis.isSupported) && (
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className={`${isMobile ? 'w-16 h-12' : 'w-20 h-8'} border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0`} data-testid="select-language">
                <SelectValue>
                  <div className="flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    <span className="text-xs">
                      {LANGUAGE_OPTIONS.find(lang => lang.code === selectedLanguage)?.flag || '🌐'}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} data-testid={`language-option-${lang.code}`}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          {chatId && (
            <Button 
              variant="ghost" 
              size="sm"
              className={`${isMobile ? 'h-12 w-12 p-0 touch-manipulation' : ''}`}
              onClick={() => deleteChatMutation.mutate()}
              disabled={deleteChatMutation.isPending}
              data-testid="button-delete-chat"
              aria-label="Delete chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className={`flex-1 overflow-hidden ${isMobile ? 'p-3 space-y-4' : 'p-4 space-y-6'}`} data-testid="chat-messages">
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
          <MessageComponent 
            key={msg.id} 
            message={msg} 
            speechSynthesis={speechSynthesis}
            selectedLanguage={selectedLanguage}
          />
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
              placeholder={isListening ? "Listening..." : (isMobile ? "Ask about stories..." : "Type your message...")}
              data-testid="textarea-message"
            />
          </div>
          {isSpeechRecognitionSupported && (
            <Button
              type="button"
              onClick={toggleSpeechRecognition}
              variant={isListening ? "destructive" : "secondary"}
              className={`${isMobile ? 'h-12 w-12 p-0 touch-manipulation shrink-0' : 'h-11 w-11'} ${isListening ? 'recording-active' : ''}`}
              data-testid="button-microphone"
              aria-label={isListening ? "Stop recording" : "Start recording"}
            >
              {isListening ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
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
