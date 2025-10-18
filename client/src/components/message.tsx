import { User, Volume2, VolumeX, Pause, Loader2, Music, FileAudio } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Use logo from public directory
const logoImage = "/logo.png";
import type { Message, MessageAttachment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface MessageProps {
  message: Message;
  speechSynthesis?: any;
  selectedLanguage?: string;
}

export default function MessageComponent({ message, speechSynthesis, selectedLanguage }: MessageProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch attachments for this message
  const { data: attachments = [] } = useQuery<MessageAttachment[]>({
    queryKey: ["/api/messages", message.id, "attachments"],
    retry: false,
  });
  
  // Sync with speech synthesis state
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
            {/* Display attachments */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} data-testid={`attachment-${attachment.id}`}>
                    {attachment.fileType === 'image' ? (
                      <img
                        src={`/${attachment.storagePath}`}
                        alt={attachment.originalName}
                        className="max-w-full rounded border border-primary-foreground/20"
                        data-testid={`img-attachment-${attachment.id}`}
                      />
                    ) : (
                      <div className="bg-primary-foreground/10 rounded p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileAudio className="h-4 w-4" />
                          <span className="text-sm" data-testid={`text-attachment-name-${attachment.id}`}>
                            {attachment.originalName}
                          </span>
                        </div>
                        <audio 
                          controls 
                          className="w-full" 
                          data-testid={`audio-player-${attachment.id}`}
                        >
                          <source src={`/${attachment.storagePath}`} type={attachment.mimeType} />
                          Your browser does not support the audio element.
                        </audio>
                        {attachment.transcription && (
                          <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                            <p className="text-xs font-medium mb-1">Transcription:</p>
                            <p className="text-sm" data-testid={`text-transcription-${attachment.id}`}>
                              {attachment.transcription}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            {/* Display attachments */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} data-testid={`attachment-${attachment.id}`}>
                    {attachment.fileType === 'image' ? (
                      <img
                        src={`/${attachment.storagePath}`}
                        alt={attachment.originalName}
                        className="max-w-full rounded border border-border"
                        data-testid={`img-attachment-${attachment.id}`}
                      />
                    ) : (
                      <div className="bg-muted rounded p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileAudio className="h-4 w-4 text-primary" />
                          <span className="text-sm" data-testid={`text-attachment-name-${attachment.id}`}>
                            {attachment.originalName}
                          </span>
                        </div>
                        <audio 
                          controls 
                          className="w-full" 
                          data-testid={`audio-player-${attachment.id}`}
                        >
                          <source src={`/${attachment.storagePath}`} type={attachment.mimeType} />
                          Your browser does not support the audio element.
                        </audio>
                        {attachment.transcription && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-medium mb-1 text-muted-foreground">Transcription:</p>
                            <p className="text-sm" data-testid={`text-transcription-${attachment.id}`}>
                              {attachment.transcription}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
