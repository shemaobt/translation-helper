import { useEffect } from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Sidebar from "@/components/sidebar";
import { 
  BarChart3, 
  MessageSquare, 
  Code, 
  Users, 
  Clock, 
  Plus, 
  Copy, 
  Trash2,
  TrendingUp,
  TrendingDown
} from "lucide-react";

// Use logo from public directory
const logoImage = "/logo.png";
import type { ApiKey } from "@shared/schema";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  // Sidebar is always visible, no toggle state needed

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const { data: apiKeys = [] } = useQuery<(ApiKey & { maskedKey: string })[]>({
    queryKey: ["/api/api-keys"],
    retry: false,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/api-keys", { name });
      return response.json();
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setShowNewKey(newKey.key);
      setNewKeyName("");
      toast({
        title: "Success",
        description: "API key created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("DELETE", `/api/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex relative overflow-hidden" data-testid="page-dashboard">
      {/* Sidebar - Always visible */}
      <div className="h-screen w-80">
        <Sidebar 
          isMobile={isMobile}
          isOpen={true}
        />
      </div>
      
      <div className={`flex-1 h-screen overflow-y-auto ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          {/* Header */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>Dashboard</h1>
                <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>Monitor your OBT Mentor Companion usage</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={`grid grid-cols-1 ${isMobile ? 'gap-4 mb-6' : 'md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'}`}>
            <Card>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Messages</p>
                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`} data-testid="stat-total-messages">
                      {(stats as any)?.totalMessages || 0}
                    </p>
                  </div>
                  <div className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} bg-primary/10 rounded-lg flex items-center justify-center`}>
                    <MessageSquare className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-primary`} />
                  </div>
                </div>
                <div className={`${isMobile ? 'mt-3' : 'mt-4'} flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Active</span>
                  <span className="text-muted-foreground ml-1">conversations</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>API Calls</p>
                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`} data-testid="stat-api-calls">
                      {(stats as any)?.totalApiCalls || 0}
                    </p>
                  </div>
                  <div className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} bg-accent/10 rounded-lg flex items-center justify-center`}>
                    <Code className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-accent-foreground`} />
                  </div>
                </div>
                <div className={`${isMobile ? 'mt-3' : 'mt-4'} flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Requests</span>
                  <span className="text-muted-foreground ml-1">processed</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Active Keys</p>
                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`} data-testid="stat-active-keys">
                      {(stats as any)?.activeApiKeys || 0}
                    </p>
                  </div>
                  <div className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} bg-secondary/10 rounded-lg flex items-center justify-center`}>
                    <Users className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-secondary-foreground`} />
                  </div>
                </div>
                <div className={`${isMobile ? 'mt-3' : 'mt-4'} flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Keys</span>
                  <span className="text-muted-foreground ml-1">in use</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Response Time</p>
                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`} data-testid="stat-response-time">
                      ~1.2s
                    </p>
                  </div>
                  <div className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} bg-muted/10 rounded-lg flex items-center justify-center`}>
                    <Clock className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-muted-foreground`} />
                  </div>
                </div>
                <div className={`${isMobile ? 'mt-3' : 'mt-4'} flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Optimized</span>
                  <span className="text-muted-foreground ml-1">performance</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>API Keys</span>
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-api-key">
                      <Plus className="h-4 w-4 mr-2" />
                      Generate New Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Generate a new API key to access your OBT Mentor Companion programmatically.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Production API, Development API, etc."
                          data-testid="input-key-name"
                        />
                      </div>
                      <Button
                        onClick={() => createApiKeyMutation.mutate(newKeyName)}
                        disabled={!newKeyName.trim() || createApiKeyMutation.isPending}
                        className="w-full"
                        data-testid="button-confirm-create-key"
                      >
                        {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {showNewKey && (
                <Alert className="mb-6">
                  <img 
                    src={logoImage} 
                    alt="Assistant" 
                    className="h-4 w-4 object-contain"
                    data-testid="img-alert-icon"
                  />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Your new API key has been generated:</p>
                      <div className="flex items-center space-x-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm flex-1" data-testid="text-new-api-key">
                          {showNewKey}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(showNewKey)}
                          data-testid="button-copy-new-key"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Make sure to copy this key now. You won't be able to see it again.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewKey(null)}
                        data-testid="button-dismiss-new-key"
                      >
                        I've saved this key
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isMobile ? (
                // Mobile card layout
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id} data-testid={`card-api-key-${key.id}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground" data-testid={`text-key-name-${key.id}`}>
                              {key.name}
                            </h3>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(key.maskedKey)}
                                className="h-8 w-8 p-0"
                                data-testid={`button-copy-key-${key.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteApiKeyMutation.mutate(key.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                data-testid={`button-delete-key-${key.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded" data-testid={`text-key-masked-${key.id}`}>
                            {key.maskedKey}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Created:</span>
                              <br />
                              <span data-testid={`text-key-created-${key.id}`}>
                                {new Date(key.createdAt || "").toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Last Used:</span>
                              <br />
                              <span data-testid={`text-key-last-used-${key.id}`}>
                                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // Desktop table layout
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Key</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Used</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {apiKeys.map((key) => (
                        <tr key={key.id} data-testid={`row-api-key-${key.id}`}>
                          <td className="py-3 px-4 text-sm text-foreground" data-testid={`text-key-name-${key.id}`}>
                            {key.name}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-muted-foreground" data-testid={`text-key-masked-${key.id}`}>
                            {key.maskedKey}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground" data-testid={`text-key-created-${key.id}`}>
                            {new Date(key.createdAt || "").toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground" data-testid={`text-key-last-used-${key.id}`}>
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(key.maskedKey)}
                                data-testid={`button-copy-key-${key.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteApiKeyMutation.mutate(key.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-key-${key.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {apiKeys.length === 0 && (
                <div className="text-center py-8">
                  <div className="h-8 w-8 mx-auto mb-2 flex items-center justify-center">
                    <img 
                      src={logoImage} 
                      alt="Assistant" 
                      className="h-8 w-8 object-contain opacity-60"
                      data-testid="img-empty-state-icon"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">No API keys yet</p>
                  <p className="text-xs text-muted-foreground">Create your first API key to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
