import { useState, useEffect, ReactNode } from "react";
import { AuthContext, useAuthQuery, useLogoutMutation } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin?: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: authUser, isLoading, error } = useAuthQuery();
  const logoutMutation = useLogoutMutation();

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        toast({
          title: "Logged out",
          description: "You have been logged out successfully.",
        });
      },
      onError: () => {
        setUser(null);
        toast({
          title: "Logged out",
          description: "You have been logged out.",
          variant: "destructive",
        });
      },
    });
  };

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    } else if (error && !isLoading) {
      setUser(null);
    }
  }, [authUser, error, isLoading]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}