import { z } from "zod";
import { requiredText } from "@/lib/validations/form";

export const resumeFormSchema = z.object({
  name: requiredText("Resume name is required."),
  content: requiredText("Resume content is required."),
});
