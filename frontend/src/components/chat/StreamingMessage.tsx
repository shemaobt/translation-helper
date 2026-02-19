const logoImage = "/logo.png";

interface StreamingMessageData {
  id: string;
  content: string;
  isComplete: boolean;
}

interface StreamingMessageProps {
  streamingMessage: StreamingMessageData;
}

export default function StreamingMessage({ streamingMessage }: StreamingMessageProps) {
  return (
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
  );
}
