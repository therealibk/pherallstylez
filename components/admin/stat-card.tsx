import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <div className="rounded-md bg-muted p-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
