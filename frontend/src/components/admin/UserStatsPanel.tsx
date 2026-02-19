import { MessageSquare, BarChart3, Key, Activity } from "lucide-react";

interface UserStats {
  totalChats: number;
  totalMessages: number;
  totalApiKeys: number;
  totalApiCalls: number;
}

interface UserStatsPanelProps {
  stats: UserStats;
  userId: string;
  isMobile: boolean;
}

export function UserStatsPanel({ stats, userId, isMobile }: UserStatsPanelProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <h4 className="font-medium text-foreground mb-3">Usage Statistics</h4>
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-chats-${userId}`}>
            <MessageSquare className="h-5 w-5" />
            {stats.totalChats}
          </div>
          <p className="text-xs text-muted-foreground">Chats</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-messages-${userId}`}>
            <BarChart3 className="h-5 w-5" />
            {stats.totalMessages}
          </div>
          <p className="text-xs text-muted-foreground">Messages</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-api-keys-${userId}`}>
            <Key className="h-5 w-5" />
            {stats.totalApiKeys}
          </div>
          <p className="text-xs text-muted-foreground">API Keys</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-foreground" data-testid={`stat-api-calls-${userId}`}>
            <Activity className="h-5 w-5" />
            {stats.totalApiCalls}
          </div>
          <p className="text-xs text-muted-foreground">API Calls</p>
        </div>
      </div>
    </div>
  );
}
