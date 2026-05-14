import { z } from "zod";
import type { ApplicationStatus, Priority } from "@/generated/prisma";
import {
  nullableDate,
  nullableText,
  requiredEnum,
  requiredText,
} from "@/lib/validations/form";

const applicationStatuses = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
  "ARCHIVED",
] as const satisfies readonly ApplicationStatus[];

const priorities = ["LOW", "MEDIUM", "HIGH"] as const satisfies readonly Priority[];

export const applicationFormSchema = z.object({
  jobPostingId: requiredText("Job posting is required."),
  resumeId: nullableText,
  status: requiredEnum(
    applicationStatuses,
    "Status is required.",
    "Invalid application status.",
  ),
  priority: requiredEnum(priorities, "Priority is required.", "Invalid priority."),
  appliedAt: nullableDate("appliedAt must be a valid date."),
  nextActionDate: nullableDate("nextActionDate must be a valid date."),
  rejectionReason: nullableText,
  notes: nullableText,
});
