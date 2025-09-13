import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Bot, Github } from "lucide-react";
import { SiReplit } from "react-icons/si";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";

export default function Landing() {
  const isMobile = useIsMobile();
  
  // Prevent FOUC by initializing with CSS-based responsive state
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className={`mt-6 ${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>Translation Helper</h2>
          <p className={`mt-2 text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>Your intelligent biblical storytelling assistant</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className={`pt-6 ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            {!hydrated ? (
              // Loading state to prevent FOUC - show mobile layout by default
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <SiReplit className="mx-auto h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Secure authentication with Replit</p>
                </div>
                <Button 
                  className="w-full h-12 text-lg font-medium"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login-mobile"
                >
                  <SiReplit className="mr-3 h-5 w-5" />
                  Continue with Replit
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Free access to biblical storytelling assistant
                </p>
              </div>
            ) : isMobile ? (
              // Mobile-optimized login interface
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <SiReplit className="mx-auto h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Secure authentication with Replit</p>
                </div>
                <Button 
                  className="w-full h-12 text-lg font-medium"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login-mobile"
                >
                  <SiReplit className="mr-3 h-5 w-5" />
                  Continue with Replit
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Free access to biblical storytelling assistant
                </p>
              </div>
            ) : (
              // Desktop login interface
              <>
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center h-11"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-login-github"
                  >
                    <Github className="mr-3 h-4 w-4" />
                    Continue with GitHub
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-center h-11"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-login-google"
                  >
                    <svg className="mr-3 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="Enter your email"
                      className="mt-2 h-11"
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input 
                      id="password"
                      type="password" 
                      placeholder="Enter your password"
                      className="mt-2 h-11"
                      data-testid="input-password"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" data-testid="checkbox-remember" />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground">Remember me</Label>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-sm" data-testid="link-forgot-password">
                      Forgot password?
                    </Button>
                  </div>
                  <Button 
                    type="button" 
                    className="w-full font-medium h-11"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-sign-in"
                  >
                    Sign In
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary font-medium"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="link-sign-up"
                  >
                    Sign up
                  </Button>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
