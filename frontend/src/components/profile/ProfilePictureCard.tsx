import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

interface ProfilePictureCardProps {
  user: User | null;
}

export function ProfilePictureCard({ user }: ProfilePictureCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/user/profile-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile picture updated successfully" });
      setPreviewImage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message || "Failed to upload image", variant: "destructive" });
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
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      uploadImageMutation.mutate(file);
    }
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Picture
        </CardTitle>
        <CardDescription>
          Upload a profile picture to personalize your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={previewImage || user?.profileImageUrl || undefined} 
              alt="Profile" 
            />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadImageMutation.isPending}
              variant="outline"
            >
              {uploadImageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Change Picture
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
