import { Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AiSectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  icon?: LucideIcon | false;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

type AiOutputPanelProps = {
  children: ReactNode;
  caption?: ReactNode;
  className?: string;
};

export function AiSectionCard({
  title,
  description,
  action,
  children,
  icon: Icon = Sparkles,
  className,
  headerClassName,
  contentClassName,
}: AiSectionCardProps) {
  return (
    <Card
      className={cn(
        "relative ring-[#C8D6E6] dark:ring-[#4F739F]/50",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[#4F739F]"
      />
      <CardHeader className={cn("gap-3", headerClassName)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            {Icon ? (
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[#A3B3C0] bg-[#F2F6FB] text-[#334F70] dark:border-[#4F739F]/60 dark:bg-[#223449]/40 dark:text-[#D6E2EF]">
                <Icon aria-hidden="true" className="size-4" />
              </div>
            ) : null}

            <div className="min-w-0 space-y-1">
              <CardTitle>{title}</CardTitle>
              {description ? (
                <CardDescription>{description}</CardDescription>
              ) : null}
            </div>
          </div>

          {action ? <div className="w-full sm:w-auto">{action}</div> : null}
        </div>
      </CardHeader>

      {children ? (
        <CardContent className={cn("min-w-0", contentClassName)}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function AiOutputPanel({
  children,
  caption = "AI-generated. Review before using.",
  className,
}: AiOutputPanelProps) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-3 rounded-lg border border-[#C8D6E6] bg-[#F2F6FB]/70 p-3.5 dark:border-[#4F739F]/60 dark:bg-[#223449]/30 sm:p-4",
        className,
      )}
    >
      {caption ? (
        <p className="text-xs font-medium text-[#334F70] dark:text-[#D6E2EF]">
          {caption}
        </p>
      ) : null}
      {children}
    </div>
  );
}
