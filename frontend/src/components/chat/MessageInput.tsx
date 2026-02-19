import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Square, Loader2 } from "lucide-react";
import { ASSISTANTS } from "@shared/schema";
import type { AssistantId } from "@shared/schema";

const ASSISTANT_CONFIG = ASSISTANTS;

interface MessageInputProps {
  message: string;
  onMessageChange: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isTyping: boolean;
  isSending: boolean;
  isMobile?: boolean;
  currentAssistant: AssistantId;
  isListening: boolean;
  isSpeechRecognitionSupported: boolean;
  permissionDenied: boolean;
  onToggleSpeechRecognition: () => void;
}

export default function MessageInput({
  message,
  onMessageChange,
  onSubmit,
  isTyping,
  isSending,
  isMobile = false,
  currentAssistant,
  isListening,
  isSpeechRecognitionSupported,
  permissionDenied,
  onToggleSpeechRecognition,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className={`border-t border-border bg-card sticky bottom-0 z-40 shadow-up ${isMobile ? 'p-3 phone-xs:p-2 phone-sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'p-4'}`}>
      <form onSubmit={onSubmit} className={`flex ${isMobile ? 'space-x-2 phone-xs:space-x-1 phone-sm:space-x-2' : 'space-x-3'}`} data-testid="form-message">
        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
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
            onClick={onToggleSpeechRecognition}
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
          disabled={!message.trim() || isSending || isTyping}
          className={`${isMobile ? 'min-h-[44px] min-w-[44px] h-11 w-11 phone-sm:h-12 phone-sm:w-12 p-0 touch-manipulation shrink-0' : 'h-11'}`}
          data-testid="button-send"
          aria-label={
            isTyping || isSending 
              ? "Sending..." 
              : "Send message"
          }
        >
          {isTyping || isSending ? (
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
  );
}
