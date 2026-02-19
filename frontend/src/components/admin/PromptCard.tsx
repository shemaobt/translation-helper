import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Loader2
} from "lucide-react";
import type { AgentPrompt } from "@shared/schema";

interface PromptCardProps {
  agentPrompt: AgentPrompt;
  isExpanded: boolean;
  onToggleExpand: () => void;
  editingPrompt: string;
  editingName: string;
  editingDescription: string;
  onPromptChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isResetting: boolean;
}

function formatDate(date: string | Date | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PromptCard({
  agentPrompt,
  isExpanded,
  onToggleExpand,
  editingPrompt,
  editingName,
  editingDescription,
  onPromptChange,
  onNameChange,
  onDescriptionChange,
  hasChanges,
  onSave,
  onReset,
  isSaving,
  isResetting,
}: PromptCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {agentPrompt.name}
                    {hasChanges && (
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
                {isExpanded ? (
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
                  value={editingName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Agent name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`desc-${agentPrompt.agentId}`}>Description</Label>
                <Input
                  id={`desc-${agentPrompt.agentId}`}
                  value={editingDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`prompt-${agentPrompt.agentId}`}>System Prompt</Label>
              <Textarea
                id={`prompt-${agentPrompt.agentId}`}
                value={editingPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter the system prompt for this agent..."
              />
              <p className="text-xs text-muted-foreground">
                {editingPrompt.length} characters
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isResetting}>
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
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
                      onClick={onReset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={onSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
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
  );
}
