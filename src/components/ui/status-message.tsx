import type { ReactNode } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusMessageVariant = "error" | "success" | "warning" | "info";

type StatusMessageProps = {
  variant: StatusMessageVariant;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

const variantStyles = {
  error: {
    container: "border-destructive/40 bg-destructive/10 text-destructive",
    description: "text-destructive/90",
    icon: OctagonXIcon,
    role: "alert",
  },
  success: {
    container:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300",
    description: "text-green-700/90 dark:text-green-300/90",
    icon: CircleCheckIcon,
    role: "status",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
    description: "text-amber-800/90 dark:text-amber-300/90",
    icon: TriangleAlertIcon,
    role: "status",
  },
  info: {
    container: "border-border bg-muted/40 text-foreground",
    description: "text-muted-foreground",
    icon: InfoIcon,
    role: "status",
  },
} as const;

export function StatusMessage({
  variant,
  title,
  description,
  children,
}: StatusMessageProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      role={styles.role}
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        styles.container,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-2">
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description ? (
            <div className={cn("leading-6", styles.description)}>
              {description}
            </div>
          ) : null}
        </div>
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
