import type {
  ApplicationStatus,
  InterviewOutcome,
  Priority,
  TaskStatus,
} from "@/generated/prisma"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusValue = ApplicationStatus | TaskStatus | InterviewOutcome
type BadgeTone =
  | "neutral"
  | "blue"
  | "indigo"
  | "green"
  | "amber"
  | "rose"
  | "slate"

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted/50 text-muted-foreground",
  blue:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300",
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-300",
  green:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  rose:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300",
  slate:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
}

const statusConfig: Record<StatusValue, { label: string; tone: BadgeTone }> = {
  SAVED: { label: "Saved", tone: "slate" },
  INTERESTED: { label: "Interested", tone: "blue" },
  APPLIED: { label: "Applied", tone: "indigo" },
  SCREENING: { label: "Screening", tone: "amber" },
  INTERVIEWING: { label: "Interviewing", tone: "amber" },
  OFFER: { label: "Offer", tone: "green" },
  ACCEPTED: { label: "Accepted", tone: "green" },
  REJECTED: { label: "Rejected", tone: "rose" },
  WITHDRAWN: { label: "Withdrawn", tone: "slate" },
  GHOSTED: { label: "Ghosted", tone: "rose" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  PENDING: { label: "Pending", tone: "amber" },
  DONE: { label: "Done", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
  PASSED: { label: "Passed", tone: "green" },
  FAILED: { label: "Failed", tone: "rose" },
  NO_SHOW: { label: "No show", tone: "rose" },
}

const priorityConfig: Record<Priority, { label: string; tone: BadgeTone }> = {
  HIGH: { label: "High priority", tone: "rose" },
  MEDIUM: { label: "Medium priority", tone: "amber" },
  LOW: { label: "Low priority", tone: "slate" },
}

function formatUnknownValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getMatchTone(score: number): BadgeTone {
  if (score >= 80) {
    return "green"
  }

  if (score >= 60) {
    return "amber"
  }

  return "slate"
}

type StatusBadgeProps = {
  status: StatusValue
  className?: string
}

type PriorityBadgeProps = {
  priority: Priority
  className?: string
}

type MatchBadgeProps = {
  score: number
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: formatUnknownValue(status),
    tone: "neutral" as const,
  }

  return (
    <Badge className={cn(toneStyles[config.tone], className)}>
      {config.label}
    </Badge>
  )
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <Badge className={cn(toneStyles[config.tone], className)}>
      {config.label}
    </Badge>
  )
}

export function MatchBadge({ score, className }: MatchBadgeProps) {
  const roundedScore = Math.round(Math.min(100, Math.max(0, score)))
  const tone = getMatchTone(roundedScore)

  return (
    <Badge className={cn(toneStyles[tone], className)}>
      {roundedScore}% match
    </Badge>
  )
}
