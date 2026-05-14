import { z } from "zod";
import type { InterviewOutcome, InterviewType } from "@/generated/prisma";
import {
  nullableInteger,
  nullableText,
  requiredDateTime,
  requiredEnum,
  requiredText,
} from "@/lib/validations/form";

const interviewTypes = [
  "PHONE_SCREEN",
  "TECHNICAL",
  "BEHAVIORAL",
  "SYSTEM_DESIGN",
  "CASE_STUDY",
  "IN_PERSON",
  "FINAL",
] as const satisfies readonly InterviewType[];

const interviewOutcomes = [
  "PENDING",
  "PASSED",
  "FAILED",
  "CANCELLED",
  "NO_SHOW",
] as const satisfies readonly InterviewOutcome[];

export const interviewFormSchema = z.object({
  applicationId: requiredText("Application is required."),
  type: requiredEnum(
    interviewTypes,
    "Interview type is required.",
    "Invalid interview type.",
  ),
  scheduledAt: requiredDateTime("Scheduled date and time are required."),
  durationMinutes: nullableInteger(
    "durationMinutes must be a valid positive number.",
    0,
  ),
  locationOrLink: nullableText,
  interviewerName: nullableText,
  interviewerEmail: nullableText,
  prepNotes: nullableText,
  outcome: requiredEnum(
    interviewOutcomes,
    "Outcome is required.",
    "Invalid interview outcome.",
  ),
  feedback: nullableText,
});
