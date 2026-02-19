import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const logoImage = "/logo.png";

interface SidebarHeaderProps {
  isMobile: boolean;
  onClose?: () => void;
}

export function SidebarHeader({ isMobile, onClose }: SidebarHeaderProps) {
  return (
    <div className={`${isMobile ? 'p-3 phone-xs:p-2 phone-sm:p-3 pt-[max(1rem,env(safe-area-inset-top))]' : 'p-4'} border-b border-border`}>
      <div className="flex items-center justify-between h-10">
        <div className="flex items-center space-x-3 phone-xs:space-x-2 phone-sm:space-x-3 flex-1 min-w-0">
          <Link href="/" className="h-8 w-8 phone-xs:h-6 phone-xs:w-6 phone-sm:h-8 phone-sm:w-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer">
            <img 
              src={logoImage} 
              alt="Translation Helper Logo" 
              className="h-8 w-8 phone-xs:h-6 phone-xs:w-6 phone-sm:h-8 phone-sm:w-8 object-contain"
              data-testid="img-app-logo"
            />
          </Link>
          <span className={`font-semibold text-foreground truncate ${isMobile ? 'text-sm phone-xs:text-xs phone-sm:text-lg' : 'text-sm md:text-base'}`}>Translation Helper</span>
        </div>
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`flex-shrink-0 ${isMobile ? 'min-h-[44px] min-w-[44px] h-11 w-11 phone-sm:h-12 phone-sm:w-12' : 'h-8 w-8'} p-0 touch-manipulation`}
            data-testid="button-close-sidebar"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
