import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Generate or get anonymous user ID from localStorage
function getAnonymousUserId() {
  let userId = localStorage.getItem('anonymous_user_id');
  if (!userId) {
    userId = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('anonymous_user_id', userId);
  }
  return userId;
}

export function useAuth() {
  // Keep the same hook pattern but return anonymous user
  const { data: authenticatedUser, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: false, // Disable the actual query
  });

  // Create anonymous user data
  const anonymousUser = {
    id: getAnonymousUserId(),
    email: 'anonymous@user.com',
    firstName: 'Anonymous',
    lastName: 'User',
  };

  return {
    user: anonymousUser,
    isLoading: false,
    isAuthenticated: true,
  };
}
