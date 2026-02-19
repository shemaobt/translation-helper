import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MessageComponent from "./message";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  WelcomeScreen,
  ChatHeader,
  StreamingMessage,
  TypingIndicator,
  MessageInput,
} from "./chat";
import type { Message, Chat, AssistantId } from "@shared/schema";
import { ASSISTANTS } from "@shared/schema";

const logoImage = "/logo.png";
const ASSISTANT_CONFIG = ASSISTANTS;

interface ChatInterfaceProps {
  chatId?: string;
  isMobile?: boolean;
  onOpenSidebar?: () => void;
  defaultAssistant?: AssistantId;
  onDefaultAssistantChange?: (assistantId: AssistantId) => void;
}

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
  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    content: string;
    isComplete: boolean;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
        'no-speech': 'No speech detected. Please try speaking again.',
        'audio-capture': 'Microphone not available. Please check your microphone.',
        'network': 'Network error occurred during speech recognition.',
      };
      
      toast({
        title: "Voice Input Error",
        description: errorMessages[lastError] || 'Speech recognition error occurred',
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
    onError: () => {
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
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, { content });
      return response.json();
    },
    onMutate: () => setIsTyping(true),
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
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message",
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

  const sendStreamingMessage = async (content: string) => {
    if (!chatId) return;
    
    setIsTyping(true);
    setStreamingMessage(null);
    
    try {
      const response = await fetch(`/api/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Streaming request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

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
                  setStreamingMessage({ id: data.data.id, content: '', isComplete: false });
                  break;
                case 'content':
                  setStreamingMessage(prev => prev ? { ...prev, content: prev.content + data.data } : null);
                  break;
                case 'done':
                  setIsTyping(false);
                  setStreamingMessage(prev => prev ? { ...prev, isComplete: true } : null);
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
                    setStreamingMessage(null);
                  }, 100);
                  break;
                case 'error':
                  throw new Error(data.data.message);
              }
            } catch {
              console.error('Error parsing SSE data');
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
      toast({ title: "Streaming failed", description: "Falling back to regular messaging", variant: "default" });
      sendMessageMutation.mutate(content);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId || isTyping) return;
    sendStreamingMessage(message.trim());
  };
  
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
      <WelcomeScreen
        isMobile={isMobile}
        onOpenSidebar={onOpenSidebar}
        currentAssistant={currentAssistant}
        onAssistantSwitch={handleAssistantSwitch}
        onCreateChat={() => createChatMutation.mutate()}
        isCreatingChat={createChatMutation.isPending}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatHeader
        isMobile={isMobile}
        onOpenSidebar={onOpenSidebar}
        speechSynthesis={speechSynthesis}
      />

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 pb-28 space-y-4' : 'p-4 pb-32 space-y-6'}`} data-testid="chat-messages">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex justify-center">
            <div className="max-w-2xl text-center">
              <div className="h-16 w-16 rounded-lg flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img src={logoImage} alt="Translation Helper Logo" className="h-16 w-16 object-contain" data-testid="img-welcome-logo" />
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

        {streamingMessage && <StreamingMessage streamingMessage={streamingMessage} />}
        {isTyping && !streamingMessage && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        message={message}
        onMessageChange={setMessage}
        onSubmit={handleSubmit}
        isTyping={isTyping}
        isSending={sendMessageMutation.isPending}
        isMobile={isMobile}
        currentAssistant={currentAssistant}
        isListening={isListening}
        isSpeechRecognitionSupported={isSpeechRecognitionSupported}
        permissionDenied={permissionDenied}
        onToggleSpeechRecognition={toggleSpeechRecognition}
      />
    </div>
  );
}
