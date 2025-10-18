import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Generate or get anonymous user ID from localStorage
function getAnonymousUserId() {
  let userId = localStorage.getItem('anonymous_user_id');
  if (!userId) {
    userId = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('anonymous_user_id', userId);
  }
  return userId;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-anonymous-user': getAnonymousUserId(),
    ...customHeaders,
  };
  
  // Add CSRF protection header for state-changing operations
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (stateChangingMethods.includes(method.toUpperCase())) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  let body: string | FormData | undefined;
  
  if (data instanceof FormData) {
    // For FormData, don't set Content-Type - let browser set it with boundary
    body = data;
  } else if (data) {
    // For regular JSON data
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: {
        'x-anonymous-user': getAnonymousUserId(),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds - fast updates for real-time chat
      gcTime: 10 * 60 * 1000, // 10 minutes - keep data in memory longer for better UX
      retry: (failureCount, error: any) => {
        // Smarter retry logic - don't retry auth errors or not found
        if (error?.message?.includes('401') || error?.message?.includes('404')) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: true, // Refetch when internet connection restored
    },
    mutations: {
      retry: 1, // Retry mutations once for network issues
    },
  },
});
