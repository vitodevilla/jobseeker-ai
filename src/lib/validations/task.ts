import { z } from "zod";
import type { Priority, TaskStatus } from "@/generated/prisma";
import {
  nullableDate,
  nullableText,
  requiredEnum,
  requiredText,
} from "@/lib/validations/form";

const taskStatuses = [
  "PENDING",
  "DONE",
  "CANCELLED",
] as const satisfies readonly TaskStatus[];

const priorities = ["LOW", "MEDIUM", "HIGH"] as const satisfies readonly Priority[];

export const taskFormSchema = z.object({
  applicationId: nullableText,
  title: requiredText("Task title is required."),
  description: nullableText,
  dueAt: nullableDate("dueAt must be a valid date."),
  status: requiredEnum(taskStatuses, "Status is required.", "Invalid task status."),
  priority: requiredEnum(priorities, "Priority is required.", "Invalid priority."),
  completionNotes: nullableText,
});
