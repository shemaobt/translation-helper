import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <Card className="w-full max-w-md mx-4">
      <CardContent className="pt-6">
        

        <p className="mt-4 text-sm text-gray-600">
          Did you forget to add the page to the router?
        </p>
      </CardContent>
    </Card>
  );
}
