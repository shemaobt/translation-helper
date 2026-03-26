import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2, Save } from "lucide-react";

const profileSchema = z.object({
  organization: z.string().optional(),
  projectType: z.enum(["mother tongue translator", "facilitator", "translation advisor", "consultant/mentor", "administrator", "other"]).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface OrganizationCardProps {
  user: { organization?: string | null; projectType?: string | null } | null;
}

export function OrganizationCard({ user }: OrganizationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      organization: "",
      projectType: undefined,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        organization: (user as any)?.organization || "",
        projectType: (user as any)?.projectType || undefined,
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { organization?: string; projectType?: string }) => {
      const response = await apiRequest("PATCH", "/api/user/update-profile", data, {
        "X-Requested-With": "XMLHttpRequest",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate({
      organization: data.organization || undefined,
      projectType: data.projectType || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization & Project Type
        </CardTitle>
        <CardDescription>
          Update your organization and project type information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your organization"
                      {...field}
                      value={field.value || ""}
                    />
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
                  <FormLabel>Project Type</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value || undefined)}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
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

            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
