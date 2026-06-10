import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DangerZoneCardProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
};

export function DangerZoneCard({
  title,
  description,
  children,
}: DangerZoneCardProps) {
  return (
    <Card
      size="sm"
      className="border-l-4 border-l-destructive/50 bg-card ring-rose-200 dark:ring-rose-900/70"
    >
      <CardHeader>
        <CardTitle className="text-destructive dark:text-rose-200">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground dark:text-rose-200/80">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}
