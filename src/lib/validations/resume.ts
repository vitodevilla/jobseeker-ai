import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const resumeFormSchema = z.object({
  name: z.string().trim().min(1, "Resume name is required."),
  content: optionalText,
});
