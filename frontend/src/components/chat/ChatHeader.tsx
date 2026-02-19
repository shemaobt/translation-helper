import { Button } from "@/components/ui/button";
import FeedbackForm from "@/components/feedback-form";
import { Menu, MessageSquare, Volume2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Voice {
  id: string;
  name: string;
}

interface SpeechSynthesisState {
  isSupported: boolean;
  voices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice | null) => void;
}

interface ChatHeaderProps {
  isMobile?: boolean;
  onOpenSidebar?: () => void;
  speechSynthesis: SpeechSynthesisState;
}

export default function ChatHeader({
  isMobile = false,
  onOpenSidebar,
  speechSynthesis,
}: ChatHeaderProps) {
  return (
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
  );
}
