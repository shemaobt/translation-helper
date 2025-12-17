import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { config } from "@/config";

export function useAdminGuard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = config.auth.loginPath;
      }, config.auth.redirectDelayMs);
      return;
    }
    
    if (!isLoading && isAuthenticated && user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required. Redirecting to dashboard...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = config.auth.dashboardPath;
      }, config.auth.redirectDelayMs);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: user?.isAdmin ?? false,
    canAccess: !isLoading && isAuthenticated && user?.isAdmin === true,
  };
}

