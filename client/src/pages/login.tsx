import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Clock, XCircle } from "lucide-react";

// Use logo from public directory
const logoImage = "/logo.png";

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

  // Get URL search parameters to check for messages
  const urlParams = new URLSearchParams(window.location.search);
  const messageType = urlParams.get('message');


  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", data);
        return response.json();
      } catch (error: any) {
        // Parse JSON error response to get approval status
        if (error.message && error.message.includes('{')) {
          try {
            const errorJson = JSON.parse(error.message.split(': ')[1]);
            throw { ...errorJson, originalMessage: error.message };
          } catch {
            // If JSON parsing fails, throw original error
            throw error;
          }
        }
        throw error;
      }
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      login(user);
      setLocation("/");
    },
    onError: (error: any) => {
      // Handle specific approval-related errors
      if (error.approvalStatus === 'pending') {
        toast({
          title: "Account pending approval",
          description: "Your account is awaiting admin approval. Please wait for approval before logging in.",
          variant: "destructive",
        });
      } else if (error.approvalStatus === 'rejected') {
        toast({
          title: "Account access denied",
          description: "Your account has been rejected. Please contact support for assistance.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login failed",
          description: error.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen overflow-y-auto px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
            <img 
              src={logoImage} 
              alt="OBT Mentor Companion Logo" 
              className="h-12 w-12 object-contain"
              data-testid="img-login-logo"
            />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your OBT Mentor Companion account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show appropriate message based on URL parameters */}
          {messageType === 'pending' && (
            <Alert className="mb-4" data-testid="alert-pending">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your account has been created and is awaiting admin approval. You'll be able to log in once approved.
              </AlertDescription>
            </Alert>
          )}
          
          {messageType === 'rejected' && (
            <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" data-testid="alert-rejected">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                Your account has been rejected. Please contact support for assistance.
              </AlertDescription>
            </Alert>
          )}
          
          {messageType === 'approved' && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" data-testid="alert-approved">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Your account has been approved! You can now log in.
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          data-testid="input-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;