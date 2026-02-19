import { Button } from "@/components/ui/button";
import FeedbackForm from "@/components/feedback-form";
import { Menu, ChevronDown, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssistantId } from "@shared/schema";
import { ASSISTANTS } from "@shared/schema";

const logoImage = "/logo.png";
const ASSISTANT_CONFIG = ASSISTANTS;

interface WelcomeScreenProps {
  isMobile?: boolean;
  onOpenSidebar?: () => void;
  currentAssistant: AssistantId;
  onAssistantSwitch: (assistantId: AssistantId) => void;
  onCreateChat: () => void;
  isCreatingChat: boolean;
}

export default function WelcomeScreen({
  isMobile = false,
  onOpenSidebar,
  currentAssistant,
  onAssistantSwitch,
  onCreateChat,
  isCreatingChat,
}: WelcomeScreenProps) {
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
                    onClick={() => onAssistantSwitch(assistant.id as AssistantId)}
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
              onClick={onCreateChat}
              disabled={isCreatingChat}
              className={`w-full max-w-sm ${isMobile ? 'h-12' : ''} bg-primary hover:bg-primary/90 text-primary-foreground`}
              data-testid="button-start-new-chat"
            >
              {isCreatingChat ? "Starting..." : "Start a New Chat"}
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
