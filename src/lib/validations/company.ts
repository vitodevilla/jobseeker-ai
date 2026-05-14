import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Company name is required."),
  website: optionalText,
  industry: optionalText,
  size: optionalText,
  notes: optionalText,
});
