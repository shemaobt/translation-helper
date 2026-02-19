import { User, Volume2, VolumeX, Pause, Loader2 } from "lucide-react";

const logoImage = "/logo.png";
import type { Message } from "@shared/schema";
import type { SpeechSynthesisHook } from "@/types";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface MessageProps {
  message: Message;
  speechSynthesis?: SpeechSynthesisHook;
  selectedLanguage?: string;
}

export default function MessageComponent({ message, speechSynthesis, selectedLanguage }: MessageProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (speechSynthesis) {
      setIsSpeaking(speechSynthesis.isSpeaking);
      setIsLoading(speechSynthesis.isLoading);
    }
  }, [speechSynthesis?.isSpeaking, speechSynthesis?.isLoading]);

  const handleSpeak = () => {
    if (!speechSynthesis || !speechSynthesis.isSupported) return;
    
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speechSynthesis.speak(message.content, selectedLanguage);
      setIsSpeaking(true);
    }
  };
  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return "Unknown";
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)} minutes ago`;
    
    const diffInHours = diffInMinutes / 60;
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    
    return date.toLocaleDateString();
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end" data-testid={`message-user-${message.id}`}>
        <div className="max-w-2xl">
          <div className="bg-primary text-primary-foreground rounded-lg rounded-br-sm p-4">
            <p data-testid={`text-message-content-${message.id}`}>{message.content}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right" data-testid={`text-message-timestamp-${message.id}`}>
            {formatTimestamp(message.createdAt || "")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-testid={`message-assistant-${message.id}`}>
      <div className="max-w-2xl">
        <div className="flex items-start space-x-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
            <img 
              src={logoImage} 
              alt="Assistant" 
              className="h-6 w-6 object-contain"
              data-testid={`img-assistant-avatar-${message.id}`}
            />
          </div>
          <div className="bg-card border border-border rounded-lg rounded-bl-sm p-4">
            <div className="text-foreground leading-relaxed whitespace-pre-wrap" data-testid={`text-message-content-${message.id}`}>
              {message.content}
            </div>
            {speechSynthesis && speechSynthesis.isSupported && (
              <Button
                onClick={handleSpeak}
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2"
                data-testid={`button-speak-${message.id}`}
                disabled={isLoading}
                aria-label={
                  isLoading 
                    ? "Loading audio..." 
                    : isSpeaking 
                      ? "Stop speaking" 
                      : "Play message"
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : isSpeaking ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3 mr-1" />
                    Play
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-11" data-testid={`text-message-timestamp-${message.id}`}>
          {formatTimestamp(message.createdAt || "")}
        </p>
      </div>
    </div>
  );
}
