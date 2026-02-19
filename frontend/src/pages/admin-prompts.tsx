import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import { PromptCard } from "@/components/admin";
import { FileText, Loader2, RefreshCw } from "lucide-react";
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
      setTimeout(() => { window.location.href = "/login"; }, 500);
      return;
    }
    
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => { window.location.href = "/"; }, 500);
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
      clearEditingState(data.agentId);
      toast({ title: "Success", description: "Prompt updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update prompt", variant: "destructive" });
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
      clearEditingState(data.agentId);
      toast({ title: "Success", description: "Prompt reset to default successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to reset prompt", variant: "destructive" });
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
      toast({ title: "Success", description: "Prompts seeded successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to seed prompts", variant: "destructive" });
    },
  });

  const clearEditingState = (agentId: string) => {
    setEditingPrompts(prev => { const newState = { ...prev }; delete newState[agentId]; return newState; });
    setEditingNames(prev => { const newState = { ...prev }; delete newState[agentId]; return newState; });
    setEditingDescriptions(prev => { const newState = { ...prev }; delete newState[agentId]; return newState; });
  };

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
                <PromptCard
                  key={agentPrompt.id}
                  agentPrompt={agentPrompt}
                  isExpanded={expandedAgents.has(agentPrompt.agentId)}
                  onToggleExpand={() => toggleExpanded(agentPrompt.agentId)}
                  editingPrompt={getEditingPrompt(agentPrompt)}
                  editingName={getEditingName(agentPrompt)}
                  editingDescription={getEditingDescription(agentPrompt)}
                  onPromptChange={(value) => setEditingPrompts(prev => ({ ...prev, [agentPrompt.agentId]: value }))}
                  onNameChange={(value) => setEditingNames(prev => ({ ...prev, [agentPrompt.agentId]: value }))}
                  onDescriptionChange={(value) => setEditingDescriptions(prev => ({ ...prev, [agentPrompt.agentId]: value }))}
                  hasChanges={hasChanges(agentPrompt)}
                  onSave={() => handleSave(agentPrompt)}
                  onReset={() => resetPromptMutation.mutate(agentPrompt.agentId)}
                  isSaving={updatePromptMutation.isPending}
                  isResetting={resetPromptMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
