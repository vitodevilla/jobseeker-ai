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
      className="bg-[#FFF1F2] ring-[#FECDD3] dark:bg-rose-950/20 dark:ring-rose-900/70"
    >
      <CardHeader>
        <CardTitle className="text-rose-900 dark:text-rose-200">
          {title}
        </CardTitle>
        <CardDescription className="text-rose-900/75 dark:text-rose-200/80">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}
