import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserWithStats } from "@/types";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithStats;
  password?: string;
  formatName: (user: UserWithStats) => string;
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  user,
  password,
  formatName,
}: PasswordResetDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Temporary password copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy password",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-password-reset">
        <DialogHeader>
          <DialogTitle>Password Reset Successful</DialogTitle>
          <DialogDescription>
            The password has been reset for {user ? formatName(user) : ""}. 
            Please provide the user with this temporary password:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <Label className="text-sm font-medium">Temporary Password</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input 
                type="text" 
                value={password || ""} 
                readOnly 
                className="font-mono"
                data-testid="input-temp-password"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => password && copyToClipboard(password)}
                data-testid="button-copy-password"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Important:</strong> The user should change this password immediately after logging in. 
            This temporary password will be shown only once.
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} data-testid="button-close-password-dialog">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
