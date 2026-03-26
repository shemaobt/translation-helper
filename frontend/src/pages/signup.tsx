import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Camera, User, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  organization: z.string().optional(),
  projectType: z.enum(["mother tongue translator", "facilitator", "translation advisor", "consultant/mentor", "administrator", "other"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const STEP_1_FIELDS = ["firstName", "lastName", "email", "password", "confirmPassword"] as const;

function Signup() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "", password: "", confirmPassword: "",
      firstName: "", lastName: "",
      organization: "", projectType: undefined,
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image must be less than 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => setProfileImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const signupMutation = useMutation({
    mutationFn: async (data: Omit<SignupFormData, 'confirmPassword'> & { profileImageUrl?: string }) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.approvalStatus === 'pending') {
        toast({ title: "Account created!", description: "Your account is awaiting admin approval." });
        setLocation("/login?message=pending");
      } else if (result.id) {
        toast({ title: "Welcome!", description: "Your account has been created and you're now logged in." });
        login(result);
        setLocation("/");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Signup failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleContinue = async () => {
    const valid = await form.trigger(STEP_1_FIELDS as unknown as (keyof SignupFormData)[]);
    if (valid) setStep(2);
  };

  const onSubmit = (data: SignupFormData) => {
    const { confirmPassword, ...signupData } = data;
    signupMutation.mutate({
      ...signupData,
      organization: signupData.organization || undefined,
      projectType: signupData.projectType || undefined,
      profileImageUrl: profileImage || undefined,
    });
  };

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8 lg:mb-10 space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[0.95]">
          {step === 1 ? "Create account" : "Your profile"}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          {step === 1 ? "Set up your account to get started" : "Tell us about yourself (optional)"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1 — Account details */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" className="h-12 rounded-xl text-base" autoFocus data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" className="h-12 rounded-xl text-base" data-testid="input-last-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" className="h-12 rounded-xl text-base" data-testid="input-email" {...field} />
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
                          placeholder="Create a password"
                          autoComplete="new-password"
                          className="h-12 rounded-xl text-base pr-12"
                          data-testid="input-password"
                          {...field}
                        />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          className="h-12 rounded-xl text-base pr-12"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} data-testid="button-toggle-confirm-password">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                className="w-full h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all duration-200"
                onClick={handleContinue}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2 — Profile details */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Profile picture */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={profileImage || undefined} alt="Profile" />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">Add a profile picture</p>
              </div>

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your organization" className="h-12 rounded-xl text-base" data-testid="input-organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Project type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl text-base" data-testid="select-project-type">
                          <SelectValue placeholder="Select your project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mother tongue translator">Mother Tongue Translator</SelectItem>
                        <SelectItem value="facilitator">Facilitator</SelectItem>
                        <SelectItem value="translation advisor">Translation Advisor</SelectItem>
                        <SelectItem value="consultant/mentor">Consultant/Mentor</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all duration-200"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-all duration-200"
                  disabled={signupMutation.isPending}
                  data-testid="button-signup"
                >
                  {signupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {signupMutation.isPending ? "Creating..." : "Create account"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-border/40">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Signup;
