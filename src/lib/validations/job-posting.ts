import { z } from "zod";
import type { WorkMode } from "@/generated/prisma";
import {
  nullableDate,
  nullableEnum,
  nullableInteger,
  nullableText,
  requiredText,
} from "@/lib/validations/form";

const workModes = [
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "FLEXIBLE",
] as const satisfies readonly WorkMode[];

export const jobPostingFormSchema = z.object({
  companyId: requiredText("Company is required."),
  title: requiredText("Job title is required."),
  description: requiredText("Job description is required."),
  location: nullableText,
  workMode: nullableEnum(workModes, "Invalid work mode."),
  seniorityLevel: nullableText,
  salaryMin: nullableInteger("salaryMin must be a valid number."),
  salaryMax: nullableInteger("salaryMax must be a valid number."),
  salaryCurrency: nullableText,
  url: nullableText,
  postedAt: nullableDate("postedAt must be a valid date."),
  deadline: nullableDate("deadline must be a valid date."),
});
