import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio";
import AdminFeedback from "@/pages/admin-feedback";
import AdminUsers from "@/pages/admin-users";
import AdminPortfolioView from "@/pages/admin-portfolio-view";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/" component={Login} />
          <Route path="*" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/chat/:chatId" component={Home} />
          <Route path="/portfolio" component={Portfolio} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/api-keys" component={Dashboard} />
          <Route path="/settings" component={Dashboard} />
          <Route path="/admin/feedback" component={AdminFeedback} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/portfolio/:userId" component={AdminPortfolioView} />
          <Route path="*" component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
