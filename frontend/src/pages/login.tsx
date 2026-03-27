import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const messageType = urlParams.get('message');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (user) => {
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      login(user);
      setLocation("/");
    },
    onError: (error: Error & { data?: { approvalStatus?: string } }) => {
      const approvalStatus = error.data?.approvalStatus;
      if (approvalStatus === 'pending') {
        toast({ title: "Account pending approval", description: "Your account is awaiting admin approval.", variant: "destructive" });
      } else if (approvalStatus === 'rejected') {
        toast({ title: "Account access denied", description: "Your account has been rejected. Please contact support.", variant: "destructive" });
      } else {
        toast({ title: "Login failed", description: error.message || "Please check your credentials and try again.", variant: "destructive" });
      }
    },
  });

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8 lg:mb-10 space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[0.95]">
          Welcome back
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          Sign in to your Translation Helper account
        </p>
      </div>

      {/* Status alerts */}
      {messageType === 'pending' && (
        <Alert className="mb-6" data-testid="alert-pending">
          <Clock className="h-4 w-4" />
          <AlertDescription>Your account is awaiting admin approval. You'll be able to log in once approved.</AlertDescription>
        </Alert>
      )}
      {messageType === 'rejected' && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" data-testid="alert-rejected">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">Your account has been rejected. Please contact support.</AlertDescription>
        </Alert>
      )}
      {messageType === 'approved' && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" data-testid="alert-approved">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">Your account has been approved! You can now log in.</AlertDescription>
        </Alert>
      )}
      {messageType === 'password-reset' && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">Your password has been reset. You can now log in with your new password.</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="h-12 rounded-xl text-base"
                    data-testid="input-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-12 rounded-xl text-base pr-12"
                      data-testid="input-password"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all duration-200"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-border/40">
        <p className="text-sm text-muted-foreground text-center">
          New to Translation Helper?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Login;
