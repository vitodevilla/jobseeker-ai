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
  | "steel"
  | "green"
  | "amber"
  | "rose"
  | "slate"

const toneStyles: Record<BadgeTone, string> = {
  neutral:
    "border-[#D3DCE7] bg-[#EEF3F8] text-[#46658C] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
  steel:
    "border-[#A7B9CF] bg-[#EEF3F8] text-[#3C5778] dark:border-[#4F739F]/60 dark:bg-[#223449]/40 dark:text-[#D6E2EF]",
  green:
    "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300",
  amber:
    "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  rose:
    "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C] dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300",
  slate:
    "border-[#D3DCE7] bg-[#EEF3F8] text-[#46658C] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
}

const statusConfig: Record<StatusValue, { label: string; tone: BadgeTone }> = {
  SAVED: { label: "Saved", tone: "slate" },
  INTERESTED: { label: "Interested", tone: "slate" },
  APPLIED: { label: "Applied", tone: "steel" },
  SCREENING: { label: "Screening", tone: "steel" },
  INTERVIEWING: { label: "Interviewing", tone: "steel" },
  OFFER: { label: "Offer", tone: "green" },
  ACCEPTED: { label: "Accepted", tone: "green" },
  REJECTED: { label: "Rejected", tone: "rose" },
  WITHDRAWN: { label: "Withdrawn", tone: "slate" },
  GHOSTED: { label: "Ghosted", tone: "rose" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  PENDING: { label: "Pending", tone: "slate" },
  DONE: { label: "Done", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
  PASSED: { label: "Passed", tone: "green" },
  FAILED: { label: "Failed", tone: "rose" },
  NO_SHOW: { label: "No show", tone: "rose" },
}

const priorityConfig: Record<
  Priority,
  { label: string; dotClassName: string }
> = {
  HIGH: { label: "High priority", dotClassName: "bg-[#EF4444]" },
  MEDIUM: { label: "Medium priority", dotClassName: "bg-[#EAB308]" },
  LOW: { label: "Low priority", dotClassName: "bg-[#A1A1AA]" },
}

const priorityBadgeShellClassName =
  "gap-1.5 border-[#D3DCE7] bg-[#EEF3F8] pl-1.5 pr-2 text-[#46658C] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300"

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
    <Badge className={cn(priorityBadgeShellClassName, className)}>
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", config.dotClassName)}
      />
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
