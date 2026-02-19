import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown } from "lucide-react";
import { ASSISTANTS } from "@shared/schema";
import type { AssistantId } from "@shared/schema";

interface NewChatButtonProps {
  isMobile: boolean;
  isPending: boolean;
  onCreateChat: (assistantId: AssistantId) => void;
}

export function NewChatButton({ isMobile, isPending, onCreateChat }: NewChatButtonProps) {
  return (
    <div className="p-3 phone-xs:p-2 phone-sm:p-4 md:p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={`w-full justify-center space-x-2 ${isMobile ? 'min-h-[44px] h-11 phone-sm:h-12 text-sm phone-sm:text-base touch-manipulation' : 'h-9 md:h-10'}`}
            disabled={isPending}
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className={`${isMobile ? 'w-72 phone-xs:w-64 phone-sm:w-80' : 'w-56'} max-h-64 overflow-y-auto`}>
          {Object.values(ASSISTANTS).map((assistant) => (
            <DropdownMenuItem 
              key={assistant.id}
              onClick={() => onCreateChat(assistant.id as AssistantId)}
              disabled={isPending}
              className={`${isMobile ? 'p-3 phone-xs:p-2 phone-sm:p-4 min-h-[44px] touch-manipulation' : 'p-3'}`}
              data-testid={`new-chat-assistant-${assistant.id}`}
            >
              <div className="font-medium text-left">{assistant.name}</div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
