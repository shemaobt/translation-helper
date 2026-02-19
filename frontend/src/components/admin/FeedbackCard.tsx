import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, 
  Trash2, 
  Mail,
  User,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  Eye,
  AlertCircle
} from "lucide-react";
import type { Feedback } from "@shared/schema";

interface FeedbackCardProps {
  feedback: Feedback;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "new":
      return <Circle className="h-4 w-4" />;
    case "read":
      return <Eye className="h-4 w-4" />;
    case "resolved":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "read":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "bug":
      return <AlertCircle className="h-3 w-3" />;
    case "feature":
      return <Tag className="h-3 w-3" />;
    case "general":
      return <MessageSquare className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
}

function formatTimestamp(timestamp: string | Date | null | undefined) {
  if (!timestamp) return "Unknown";
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString();
}

export function FeedbackCard({ feedback, onUpdateStatus, onDelete }: FeedbackCardProps) {
  return (
    <Card className="relative" data-testid={`card-feedback-${feedback.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge 
                className={`flex items-center gap-1 ${getStatusColor(feedback.status)}`}
                data-testid={`badge-status-${feedback.id}`}
              >
                {getStatusIcon(feedback.status)}
                {feedback.status?.charAt(0).toUpperCase() + feedback.status?.slice(1)}
              </Badge>
              {feedback.category && (
                <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-category-${feedback.id}`}>
                  {getCategoryIcon(feedback.category)}
                  {feedback.category?.charAt(0).toUpperCase() + feedback.category?.slice(1)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTimestamp(feedback.createdAt)}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-foreground whitespace-pre-wrap" data-testid={`text-message-${feedback.id}`}>
                {feedback.message}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {feedback.userName && (
                <span className="flex items-center gap-1" data-testid={`text-user-name-${feedback.id}`}>
                  <User className="h-3 w-3" />
                  {feedback.userName}
                </span>
              )}
              {feedback.userEmail && (
                <span className="flex items-center gap-1" data-testid={`text-user-email-${feedback.id}`}>
                  <Mail className="h-3 w-3" />
                  {feedback.userEmail}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid={`button-status-menu-${feedback.id}`}
                >
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(feedback.id, "new")}
                  disabled={feedback.status === "new"}
                  data-testid={`button-status-new-${feedback.id}`}
                >
                  <Circle className="mr-2 h-4 w-4" />
                  Mark as New
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(feedback.id, "read")}
                  disabled={feedback.status === "read"}
                  data-testid={`button-status-read-${feedback.id}`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Mark as Read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(feedback.id, "resolved")}
                  disabled={feedback.status === "resolved"}
                  data-testid={`button-status-resolved-${feedback.id}`}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Resolved
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-delete-${feedback.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this feedback? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid={`button-cancel-delete-${feedback.id}`}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(feedback.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid={`button-confirm-delete-${feedback.id}`}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
