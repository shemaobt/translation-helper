import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const logoImage = "/logo.png";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="min-h-screen overflow-y-auto px-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4 mb-6">
              <div className="flex items-center justify-center">
                <img src={logoImage} alt="Translation Helper Logo" className="w-16 h-16 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Enter your email and we'll send you a link to reset your password
                </p>
              </div>
            </div>

            {submitted ? (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  If an account with that email exists, we've sent a password reset link. Please check your inbox and spam folder.
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11 font-semibold" disabled={mutation.isPending}>
                    {mutation.isPending ? "Sending..." : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send reset link
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
