import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Mail, Calendar } from "lucide-react";
import type { User } from "@shared/schema";

interface AccountInfoCardProps {
  user: User | null;
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AccountInfoCard({ user }: AccountInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">First Name</Label>
            <p className="font-medium">{user?.firstName || "Not set"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Last Name</Label>
            <p className="font-medium">{user?.lastName || "Not set"}</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label className="text-muted-foreground text-sm">Email</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label className="text-muted-foreground text-sm">Member Since</Label>
            <p className="font-medium">{formatDate(user?.createdAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
