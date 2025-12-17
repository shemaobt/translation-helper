import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Sidebar from "@/components/sidebar";
import { 
  FileText, 
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Loader2,
  RefreshCw
} from "lucide-react";
import type { AgentPrompt } from "@shared/schema";

export default function AdminPrompts() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
    
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: prompts = [], isLoading: promptsLoading, refetch } = useQuery<AgentPrompt[]>({
    queryKey: ["/api/admin/prompts"],
    retry: false,
    enabled: isAuthenticated && user?.isAdmin === true,
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ agentId, prompt, name, description }: { agentId: string; prompt: string; name?: string; description?: string }) => {
      const response = await apiRequest("PUT", `/api/admin/prompts/${agentId}`, 
        { prompt, name, description },
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompts"] });
      setEditingPrompts(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      setEditingNames(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      setEditingDescriptions(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      toast({
        title: "Success",
        description: "Prompt updated successfully",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update prompt",
        variant: "destructive",
      });
    },
  });

  const resetPromptMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/admin/prompts/${agentId}/reset`, 
        undefined,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompts"] });
      setEditingPrompts(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      setEditingNames(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      setEditingDescriptions(prev => {
        const newState = { ...prev };
        delete newState[data.agentId];
        return newState;
      });
      toast({
        title: "Success",
        description: "Prompt reset to default successfully",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reset prompt",
        variant: "destructive",
      });
    },
  });

  const seedPromptsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/prompts/seed`, 
        undefined,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/prompts"] });
      toast({
        title: "Success",
        description: "Prompts seeded successfully",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to seed prompts",
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = (agentId: string) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const handlePromptChange = (agentId: string, value: string) => {
    setEditingPrompts(prev => ({ ...prev, [agentId]: value }));
  };

  const handleNameChange = (agentId: string, value: string) => {
    setEditingNames(prev => ({ ...prev, [agentId]: value }));
  };

  const handleDescriptionChange = (agentId: string, value: string) => {
    setEditingDescriptions(prev => ({ ...prev, [agentId]: value }));
  };

  const getEditingPrompt = (agentPrompt: AgentPrompt): string => {
    return editingPrompts[agentPrompt.agentId] ?? agentPrompt.prompt;
  };

  const getEditingName = (agentPrompt: AgentPrompt): string => {
    return editingNames[agentPrompt.agentId] ?? agentPrompt.name;
  };

  const getEditingDescription = (agentPrompt: AgentPrompt): string => {
    return editingDescriptions[agentPrompt.agentId] ?? (agentPrompt.description || '');
  };

  const hasChanges = (agentPrompt: AgentPrompt): boolean => {
    const currentPrompt = getEditingPrompt(agentPrompt);
    const currentName = getEditingName(agentPrompt);
    const currentDescription = getEditingDescription(agentPrompt);
    
    return currentPrompt !== agentPrompt.prompt || 
           currentName !== agentPrompt.name ||
           currentDescription !== (agentPrompt.description || '');
  };

  const handleSave = (agentPrompt: AgentPrompt) => {
    const prompt = getEditingPrompt(agentPrompt);
    const name = getEditingName(agentPrompt);
    const description = getEditingDescription(agentPrompt);
    
    updatePromptMutation.mutate({
      agentId: agentPrompt.agentId,
      prompt,
      name: name !== agentPrompt.name ? name : undefined,
      description: description !== (agentPrompt.description || '') ? description : undefined,
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || (user && !user.isAdmin)) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex relative overflow-hidden">
      <div className="relative h-full w-64 flex-shrink-0">
        <Sidebar isMobile={isMobile} isOpen={true} />
      </div>
      
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} overflow-auto`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Prompt Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage AI assistant prompts for all agents
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={promptsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${promptsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {prompts.length === 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => seedPromptsMutation.mutate()}
                  disabled={seedPromptsMutation.isPending}
                >
                  {seedPromptsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Initialize Prompts
                </Button>
              )}
            </div>
          </div>

          {promptsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : prompts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Prompts Found</h3>
                <p className="text-muted-foreground mb-4">
                  The prompts database is empty. Click "Initialize Prompts" to seed default prompts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {prompts.map((agentPrompt) => (
                <Collapsible
                  key={agentPrompt.id}
                  open={expandedAgents.has(agentPrompt.agentId)}
                  onOpenChange={() => toggleExpanded(agentPrompt.agentId)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {agentPrompt.name}
                                {hasChanges(agentPrompt) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Unsaved
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {agentPrompt.description || agentPrompt.agentId}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                v{agentPrompt.version}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(agentPrompt.updatedAt)}
                              </span>
                            </div>
                            {expandedAgents.has(agentPrompt.agentId) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`name-${agentPrompt.agentId}`}>Name</Label>
                            <Input
                              id={`name-${agentPrompt.agentId}`}
                              value={getEditingName(agentPrompt)}
                              onChange={(e) => handleNameChange(agentPrompt.agentId, e.target.value)}
                              placeholder="Agent name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`desc-${agentPrompt.agentId}`}>Description</Label>
                            <Input
                              id={`desc-${agentPrompt.agentId}`}
                              value={getEditingDescription(agentPrompt)}
                              onChange={(e) => handleDescriptionChange(agentPrompt.agentId, e.target.value)}
                              placeholder="Brief description"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`prompt-${agentPrompt.agentId}`}>System Prompt</Label>
                          <Textarea
                            id={`prompt-${agentPrompt.agentId}`}
                            value={getEditingPrompt(agentPrompt)}
                            onChange={(e) => handlePromptChange(agentPrompt.agentId, e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                            placeholder="Enter the system prompt for this agent..."
                          />
                          <p className="text-xs text-muted-foreground">
                            {getEditingPrompt(agentPrompt).length} characters
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset to Default
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Prompt?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will reset the prompt for "{agentPrompt.name}" to its default value. 
                                  Any custom changes will be lost. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => resetPromptMutation.mutate(agentPrompt.agentId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Reset
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            onClick={() => handleSave(agentPrompt)}
                            disabled={!hasChanges(agentPrompt) || updatePromptMutation.isPending}
                          >
                            {updatePromptMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
