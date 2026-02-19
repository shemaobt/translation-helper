const logoImage = "/logo.png";

export default function TypingIndicator() {
  return (
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
  );
}
