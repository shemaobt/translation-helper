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
import { Eye, EyeOff, CheckCircle, Clock, XCircle, UserPlus, LogIn } from "lucide-react";

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
        if (error.message && error.message.includes('{')) {
          try {
            const errorJson = JSON.parse(error.message.split(': ')[1]);
            throw { ...errorJson, originalMessage: error.message };
          } catch {
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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Translation Helper Logo" 
              className="w-16 h-16 object-contain"
              data-testid="img-login-logo"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to your Translation Helper account</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
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
                className="w-full h-11 font-semibold"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  "Signing in..."
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <UserPlus className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-bold text-foreground">New to Translation Helper?</h3>
            <p className="text-muted-foreground text-sm">
              Create a free account to start using our AI-powered translation assistants
            </p>
            <Link href="/signup">
              <Button 
                className="w-full h-11 font-semibold"
                data-testid="link-signup"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Free Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default Login;