import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageComponent from "./message";
import FeedbackForm from "./feedback-form";
import { Trash2, Send, Menu, ChevronDown, Mic, MicOff, Square, Languages, Volume2, Loader2, MessageSquare } from "lucide-react";

const logoImage = "/logo.png";
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
  
  const speechSynthesis = useSpeechSynthesis({ lang: selectedLanguage });
  

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

  const { data: chat } = useQuery<Chat>({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
    retry: false,
  });

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
      queryClient.removeQueries({ queryKey: ["/api/chats", chatId] });
      queryClient.removeQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
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
      onDefaultAssistantChange?.(assistantId);
      toast({
        title: "Assistant switched",
        description: `Now chatting with ${ASSISTANT_CONFIG[assistantId].name}`,
      });
      return;
    }
    
    switchAssistantMutation.mutate(assistantId);
  };

  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    isComplete: boolean;
  } | null>(null);

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

  const sendStreamingMessage = async (content: string) => {
    if (!chatId) return;
    
    setIsTyping(true);
    setStreamingMessage(null);
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'user_message':
                  queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
                  break;
                  
                case 'assistant_message_start':
                  setIsTyping(false);
                  setStreamingMessage({
                    id: data.data.id,
                    content: '',
                    isComplete: false,
                  });
                  break;
                  
                case 'content':
                  setStreamingMessage(prev => prev ? {
                    ...prev,
                    content: prev.content + data.data,
                  } : null);
                  break;
                  
                case 'done':
                  setIsTyping(false);
                  setStreamingMessage(prev => prev ? {
                    ...prev,
                    isComplete: true,
                  } : null);
                  
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
                    setStreamingMessage(null);
                  }, 100);
                  break;
                  
                case 'error':
                  throw new Error(data.data.message);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
      
      setMessage("");
      setIsTyping(false);
      
    } catch (error) {
      console.error('Streaming error:', error);
      setIsTyping(false);
      setStreamingMessage(null);
      
      toast({
        title: "Streaming failed",
        description: "Falling back to regular messaging",
        variant: "default",
      });
      
      sendMessageMutation.mutate(content);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId || isTyping) return;
    
    sendStreamingMessage(message.trim());
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
    if (transcript || interimTranscript) {
      setMessage(transcript + interimTranscript);
    }
  }, [transcript, interimTranscript]);
  
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setMessage("");
      startListening();
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
            
            <FeedbackForm
              trigger={
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-12 px-3 touch-manipulation hover:bg-muted/50"
                  data-testid="button-feedback-welcome"
                  aria-label="Send feedback"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        )}
        
        <div className="flex-1 flex justify-center items-center">
          <div className="max-w-2xl text-center">
            <div className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <img 
                src={logoImage} 
                alt="Translation Helper Logo" 
                className="h-16 w-16 object-contain"
                data-testid="img-welcome-screen-logo"
              />
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
                      <div className="font-medium">{assistant.name}</div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 space-y-3">
              <Button 
                onClick={() => createChatMutation.mutate()}
                disabled={createChatMutation.isPending}
                className={`w-full max-w-sm ${isMobile ? 'h-12' : ''} bg-primary hover:bg-primary/90 text-primary-foreground`}
                data-testid="button-start-new-chat"
              >
                {createChatMutation.isPending ? "Starting..." : "Start a New Chat"}
              </Button>
              
              <FeedbackForm
                trigger={
                  <Button 
                    variant="outline"
                    className={`w-full max-w-sm ${isMobile ? 'h-12' : ''} border-primary/20 hover:bg-primary/5`}
                    data-testid="button-feedback-welcome-center"
                    aria-label="Send feedback about the app"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Feedback
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className={`bg-card border-b border-border ${isMobile ? 'p-3 phone-xs:p-2 phone-sm:p-3 pt-[max(0.75rem,env(safe-area-inset-top))]' : 'p-4'} flex items-center justify-between sticky top-0 z-40`}>
        <div className="flex items-center space-x-3 phone-xs:space-x-2 phone-sm:space-x-3 flex-1 min-w-0 h-10">
          {isMobile && onOpenSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSidebar}
              className={`${isMobile ? 'min-h-[44px] min-w-[44px] h-11 w-11 phone-sm:h-12 phone-sm:w-12' : 'h-8 w-8'} p-0 touch-manipulation flex-shrink-0`}
              data-testid="button-open-sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
          </div>
        </div>

        <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
          {speechSynthesis.isSupported && (
            <div className="flex items-center space-x-2">
              <Select 
                value={speechSynthesis.selectedVoice?.id || 'alloy'} 
                onValueChange={(voiceId) => {
                  const voice = speechSynthesis.voices.find(v => v.id === voiceId);
                  speechSynthesis.setSelectedVoice(voice || null);
                }}
              >
                <SelectTrigger className={`${isMobile ? 'w-14 h-12' : 'w-12 h-10'} border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0`} data-testid="select-voice">
                  <SelectValue>
                    <div className="flex items-center justify-center">
                      <Volume2 className="h-6 w-6" />
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {speechSynthesis.voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id} data-testid={`voice-option-${voice.id}`}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <FeedbackForm
            trigger={
              <Button 
                variant="ghost" 
                size="sm"
                className={`${isMobile ? 'h-12 px-3 touch-manipulation' : 'px-3'} hover:bg-muted/50`}
                data-testid="button-feedback-main"
                aria-label="Send feedback"
              >
                <MessageSquare className="h-4 w-4" />
                {!isMobile && <span className="ml-2 text-sm">Feedback</span>}
              </Button>
            }
          />
          
          
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 pb-28 space-y-4' : 'p-4 pb-32 space-y-6'}`} data-testid="chat-messages">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex justify-center">
            <div className="max-w-2xl text-center">
              <div className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img 
                  src={logoImage} 
                  alt="Translation Helper Logo" 
                  className="h-16 w-16 object-contain"
                  data-testid="img-welcome-logo"
                />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Start a conversation</h2>
              <p className="text-muted-foreground mb-4">{ASSISTANT_CONFIG[currentAssistant].description}</p>
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

        {streamingMessage && (
          <div className="flex justify-start" data-testid="streaming-message">
            <div className="max-w-2xl">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                  <img 
                    src={logoImage} 
                    alt="Assistant" 
                    className="h-6 w-6 object-contain"
                    data-testid="img-assistant-avatar-streaming"
                  />
                </div>
                <div className="bg-card border border-border rounded-lg rounded-bl-sm p-4">
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-streaming-content">
                    {streamingMessage.content}
                    {!streamingMessage.isComplete && (
                      <span className="animate-pulse">▋</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-11">
                {streamingMessage.isComplete ? "Just now" : "Generating..."}
              </p>
            </div>
          </div>
        )}

        {isTyping && !streamingMessage && (
          <div className="flex justify-start" data-testid="typing-indicator">
            <div className="max-w-2xl">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                  <img 
                    src={logoImage} 
                    alt="Assistant" 
                    className="h-6 w-6 object-contain"
                    data-testid="img-assistant-avatar-typing"
                  />
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
      <div className={`border-t border-border bg-card sticky bottom-0 z-40 shadow-up ${isMobile ? 'p-3 phone-xs:p-2 phone-sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'p-4'}`}>
        <form onSubmit={handleSubmit} className={`flex ${isMobile ? 'space-x-2 phone-xs:space-x-1 phone-sm:space-x-2' : 'space-x-3'}`} data-testid="form-message">
          <div className="flex-1 min-w-0">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
              className={`resize-none ${isMobile ? 'min-h-[44px] max-h-[100px] phone-sm:max-h-[120px] text-sm phone-sm:text-base' : 'min-h-[44px] max-h-[120px]'} ${isTyping ? 'opacity-60' : ''}`}
              placeholder={
                isTyping 
                  ? "AI is responding..." 
                  : isListening 
                    ? "Listening..." 
                    : (isMobile ? "Ask about stories..." : "Type your message...")
              }
              data-testid="textarea-message"
            />
          </div>
          {isSpeechRecognitionSupported && (
            <Button
              type="button"
              onClick={toggleSpeechRecognition}
              variant={isListening ? "destructive" : "secondary"}
              className={`${isMobile ? 'min-h-[44px] min-w-[44px] h-11 w-11 phone-sm:h-12 phone-sm:w-12 p-0 touch-manipulation shrink-0' : 'h-11 w-11'} ${isListening ? 'recording-active' : ''}`}
              data-testid="button-microphone"
              aria-label={isListening ? "Stop recording" : "Start recording"}
              disabled={permissionDenied || isTyping}
            >
              {isListening ? (
                <Square className="h-4 w-4" />
              ) : permissionDenied ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending || isTyping}
            className={`${isMobile ? 'min-h-[44px] min-w-[44px] h-11 w-11 phone-sm:h-12 phone-sm:w-12 p-0 touch-manipulation shrink-0' : 'h-11'}`}
            data-testid="button-send"
            aria-label={
              isTyping || sendMessageMutation.isPending 
                ? "Sending..." 
                : "Send message"
            }
          >
            {isTyping || sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mt-2 text-center`}>
          You are chatting with {ASSISTANT_CONFIG[currentAssistant].name}
        </p>
      </div>
    </div>
  );
}
