import { z } from "zod";
import type { CoverLetterMode } from "@/generated/prisma";
import {
  checkboxBoolean,
  nullableInteger,
  nullableText,
  requiredEnum,
  requiredText,
} from "@/lib/validations/form";

const coverLetterModes = [
  "WRITTEN",
  "UPLOADED",
  "GENERATED",
] as const satisfies readonly CoverLetterMode[];

export const coverLetterFormSchema = z.object({
  applicationId: requiredText("Application is required."),
  title: requiredText("Title is required."),
  mode: requiredEnum(coverLetterModes, "Mode is required.", "Invalid cover letter mode."),
  content: nullableText,
  version: nullableInteger("version must be a valid positive number.", 1).transform(
    (value) => value ?? 1,
  ),
  isFinal: checkboxBoolean(),
});
