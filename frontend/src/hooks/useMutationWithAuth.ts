import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { config } from "@/config";

interface MutationWithAuthOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, 'onError'> {
  errorMessage?: string;
  onError?: (error: Error) => void;
}

export function useMutationWithAuth<TData = unknown, TVariables = void>(
  options: MutationWithAuthOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables> {
  const { toast } = useToast();
  const { errorMessage = "An error occurred", onError: customOnError, ...restOptions } = options;

  return useMutation({
    ...restOptions,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      
      if (customOnError) {
        customOnError(error);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });
}

