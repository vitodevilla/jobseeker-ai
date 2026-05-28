import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const DASHBOARD_ASSISTANT_MODEL = "gemini-2.5-flash";

const nonEmptyString = z.string().trim().min(1);

export const dashboardAssistantResultSchema = z.object({
  answerMarkdown: nonEmptyString,
  citedRecordKeys: z.array(z.string().trim().min(1)).max(12).default([]),
  limitations: z.array(z.string().trim().min(1)).max(6).default([]),
});

export type DashboardAssistantResult = z.infer<
  typeof dashboardAssistantResultSchema
>;

type GenerateDashboardAssistantAnswerInput = {
  question: string;
  contextText: string;
};

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildDashboardAssistantPrompt({
  question,
  contextText,
}: GenerateDashboardAssistantAnswerInput) {
  return `Answer this single-turn dashboard assistant question using only the saved JobSeeker AI context provided below.

User question:
"""${question.trim()}"""

Saved read-only context:
"""${contextText}"""

Return a structured object with:
- answerMarkdown: concise markdown. Mention relevant saved records by title, name, or company where useful. If the saved data is insufficient, say so. If the question is ambiguous, ask one clarifying question or explain the ambiguity.
- citedRecordKeys: source keys from the provided context that directly support the answer. Use only exact source keys that appear in the context. Do not include raw record IDs outside source keys.
- limitations: concise limitations about missing or unavailable saved data, if important.

Rules:
- Answer only from the saved JobSeeker AI context above.
- Do not claim to browse, fetch, scrape, or know external websites.
- Do not invent records, facts, credentials, employers, dates, scores, requirements, interviews, tasks, or applications.
- Do not infer that a technology, requirement, status, date, or follow-up exists unless it appears in saved context.
- Do not say or imply that you changed, created, updated, deleted, submitted, or scheduled anything.
- Do not offer to perform create, update, delete, submit, email, schedule, or other write actions. You may suggest manual next steps the user can take in the app.
- Keep the answer practical and concise.`;
}

export async function generateDashboardAssistantAnswer(
  input: GenerateDashboardAssistantAnswerInput,
): Promise<DashboardAssistantResult> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const generation = await generateText({
    model: google(DASHBOARD_ASSISTANT_MODEL),
    output: Output.object({
      schema: dashboardAssistantResultSchema,
      name: "dashboardAssistantAnswer",
      description:
        "A concise read-only dashboard assistant answer grounded in saved JobSeeker AI records.",
    }),
    system:
      "You are a read-only dashboard assistant for a job-search tracker. Use only provided saved records. Be honest about missing context. Never browse URLs, invent facts, or suggest write actions.",
    prompt: buildDashboardAssistantPrompt(input),
    temperature: 0.2,
    maxOutputTokens: 2200,
  });

  const parsed = dashboardAssistantResultSchema.parse(generation.output);

  return {
    answerMarkdown: parsed.answerMarkdown.trim(),
    citedRecordKeys: normalizeList(parsed.citedRecordKeys),
    limitations: normalizeList(parsed.limitations),
  };
}
