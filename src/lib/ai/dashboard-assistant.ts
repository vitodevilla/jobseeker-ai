import { google } from "@ai-sdk/google";
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import {
  createDashboardAssistantCollectedToolContext,
  createDashboardAssistantTools,
  type DashboardAssistantCollectedToolContext,
  type DashboardAssistantToolRuntime,
} from "@/lib/assistant/dashboard-tool-calling";

const DASHBOARD_ASSISTANT_MODEL = "gemini-2.5-flash";
const MAX_RECENT_MESSAGES = 6;
const MAX_RECENT_MESSAGE_LENGTH = 1200;

const nonEmptyString = z.string().trim().min(1);

export const dashboardAssistantResultSchema = z.object({
  answerMarkdown: nonEmptyString,
  citedRecordKeys: z.array(z.string().trim().min(1)).max(12).default([]),
  limitations: z.array(z.string().trim().min(1)).max(6).default([]),
});

export type DashboardAssistantResult = z.infer<
  typeof dashboardAssistantResultSchema
>;

export type DashboardAssistantRecentMessage = {
  role: "user" | "assistant";
  content: string;
};

type GenerateDashboardAssistantAnswerInput = {
  question: string;
  contextText: string;
  toolRuntime: DashboardAssistantToolRuntime;
  recentMessages?: DashboardAssistantRecentMessage[];
};

type BuildStructuredDashboardAssistantPromptInput =
  GenerateDashboardAssistantAnswerInput & {
    collectedToolContext: DashboardAssistantCollectedToolContext;
  };

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function formatToolContextSections({
  contextSections,
}: DashboardAssistantCollectedToolContext) {
  return contextSections.length > 0
    ? contextSections.join("\n\n")
    : "- No additional read-only tool results were collected.";
}

function formatToolLimitations({
  limitations,
}: DashboardAssistantCollectedToolContext) {
  return limitations.length > 0
    ? limitations.map((limitation) => `- ${limitation}`).join("\n")
    : "- none";
}

function normalizeRecentMessages(
  recentMessages: DashboardAssistantRecentMessage[] | undefined,
) {
  return (recentMessages ?? [])
    .slice(-MAX_RECENT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_RECENT_MESSAGE_LENGTH),
    }))
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.length > 0,
    );
}

function formatRecentMessages(
  recentMessages: DashboardAssistantRecentMessage[] | undefined,
) {
  const normalizedMessages = normalizeRecentMessages(recentMessages);

  return normalizedMessages.length > 0
    ? normalizedMessages
        .map((message, index) => {
          const label = message.role === "user" ? "User" : "Assistant";

          return `${index + 1}. ${label}: ${message.content}`;
        })
        .join("\n")
    : "- No recent chat history was provided.";
}

function buildDashboardAssistantToolGatheringPrompt({
  question,
  contextText,
  recentMessages,
}: GenerateDashboardAssistantAnswerInput) {
  return `Gather saved JobSeeker AI context for the current dashboard assistant chat turn by calling only the read-only tools that are useful.

Recent chat history, for conversational context only:
"""${formatRecentMessages(recentMessages)}"""

Current user question:
"""${question.trim()}"""

Saved read-only base context:
"""${contextText}"""

Available read-only tools:
- getUpcomingInterviews: scheduled interviews, interview prep timing, upcoming interview obligations.
- getPendingTasks: due, overdue, pending, or focus tasks.
- findApplicationsNeedingAttention: priorities, follow-ups, urgent applications, near-term next actions.
- searchJobPostings: saved jobs, job requirements, companies, technologies, Docker/containers, role fit, or job details.
- searchResumes: resumes, resume fit, skills in resumes, or which resume is relevant.

Tool use guidance:
- Call only the tools needed to answer the user's question.
- Do not call every tool by default.
- If the base context is enough, answer without unnecessary tool calls.
- When current page context is present, use it to resolve page-relative phrases like "this job", "this posting", and "this role".
- Current page context is saved database state only; it may not include unsaved form edits.
- Tools are read-only and return saved JobSeeker AI records only.
- Search tools should receive a concise query based on the current question, current page context, and relevant recent history.
- For questions comparing the current job to resumes, use the saved current job title, requirements, and technologies to form the resume search query.
- Use recent chat history only to resolve follow-ups, pronouns, or references in the current question.
- Do not treat previous assistant answers as saved-record evidence.
- Gather fresh saved context for this turn when useful, even if a similar previous turn exists.
- Do not perform or offer write actions.
- After any useful tool calls, reply with a brief context-gathering note. The final user-facing answer will be written in a separate step.`;
}

function buildDashboardAssistantPrompt({
  question,
  contextText,
  recentMessages,
  collectedToolContext,
}: BuildStructuredDashboardAssistantPromptInput) {
  return `Answer the current dashboard assistant chat turn using only the saved JobSeeker AI base context and collected read-only tool results from this turn.

Recent chat history, for conversational context only:
"""${formatRecentMessages(recentMessages)}"""

Current user question:
"""${question.trim()}"""

Saved read-only base context:
"""${contextText}"""

Collected read-only tool result context:
"""${formatToolContextSections(collectedToolContext)}"""

Collected tool limitations:
${formatToolLimitations(collectedToolContext)}

Return a structured object with:
- answerMarkdown: concise markdown. Mention relevant saved records by title, name, or company where useful. If the saved data is insufficient, say so. If the question is ambiguous, ask one clarifying question or explain the ambiguity.
- citedRecordKeys: source keys from the base context or tool results that directly support the answer. Use only exact source keys that appeared in the context or tool results. Do not include raw record IDs outside source keys.
- limitations: concise limitations about missing or unavailable saved data, if important.

Rules:
- Answer only from saved JobSeeker AI base context and read-only tool results.
- The current page context, when present, defines page-relative phrases like "this job", "this posting", and "this role".
- Use current page context to answer page-relative questions before searching broadly.
- Page context is saved database state only and may not include unsaved form edits.
- If the user asks about unsaved changes, say you can only see saved data.
- Recent chat history is conversational context only. Use it to resolve follow-ups and pronouns, not as factual saved-record evidence.
- Fresh base context and current-turn tool results are authoritative.
- If recent chat history conflicts with fresh saved data, follow the fresh saved data.
- Cite only source keys from the current turn's base context or current turn's tool results.
- Cite the current page source key when the answer relies on the current page record.
- Do not cite source keys from previous turns unless they appear again in the current base context or current tool results.
- The tools are read-only.
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

  const collectedToolContext = createDashboardAssistantCollectedToolContext();
  const tools = createDashboardAssistantTools({
    ...input.toolRuntime,
    state: collectedToolContext,
  });

  await generateText({
    model: google(DASHBOARD_ASSISTANT_MODEL),
    tools,
    toolChoice: "auto",
    stopWhen: stepCountIs(3),
    system:
      "You gather read-only saved JobSeeker AI context by calling relevant read-only tools. Do not perform writes. Do not produce the final user-facing answer.",
    prompt: buildDashboardAssistantToolGatheringPrompt(input),
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  const generation = await generateText({
    model: google(DASHBOARD_ASSISTANT_MODEL),
    output: Output.object({
      schema: dashboardAssistantResultSchema,
      name: "dashboardAssistantAnswer",
      description:
        "A concise read-only dashboard assistant answer grounded in saved JobSeeker AI records.",
    }),
    system:
      "You are a read-only dashboard assistant for a job-search tracker. Use only provided saved records and read-only tool results. Be honest about missing context. Never browse URLs, invent facts, or suggest write actions.",
    prompt: buildDashboardAssistantPrompt({
      ...input,
      collectedToolContext,
    }),
    temperature: 0.2,
    maxOutputTokens: 2200,
  });

  const parsed = dashboardAssistantResultSchema.parse(generation.output);

  return {
    answerMarkdown: parsed.answerMarkdown.trim(),
    citedRecordKeys: normalizeList(parsed.citedRecordKeys),
    limitations: normalizeList([
      ...collectedToolContext.limitations,
      ...parsed.limitations,
    ]),
  };
}
