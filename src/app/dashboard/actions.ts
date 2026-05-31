"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildDashboardAssistantBaseContext } from "@/lib/assistant/dashboard-context";
import type { DashboardAssistantReferencedRecord } from "@/lib/assistant/dashboard-context";
import type { DashboardAssistantPageContextInput } from "@/lib/assistant/page-context-types";
import { generateDashboardAssistantAnswer } from "@/lib/ai/dashboard-assistant";
import { auth } from "@/lib/auth";

const MAX_QUESTION_LENGTH = 1500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 1200;

const questionSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .string()
    .min(1, "Enter a question for the dashboard assistant.")
    .max(
      MAX_QUESTION_LENGTH,
      `Keep the question under ${MAX_QUESTION_LENGTH} characters.`,
    ),
);

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH)
        : value,
    z.string().min(1),
  ),
});

const pageContextSchema = z
  .object({
    type: z.enum(["jobPosting", "application"]),
    id: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string().min(1).max(200),
    ),
  })
  .strict();

export type DashboardAssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DashboardAssistantActionInput = {
  question: string;
  previousMessages?: DashboardAssistantHistoryMessage[];
  pageContext?: DashboardAssistantPageContextInput;
};

export type DashboardAssistantActionState = {
  question: string;
  answerMarkdown: string | null;
  referencedRecords: DashboardAssistantReferencedRecord[];
  limitations: string[];
  error: string | null;
};

async function getSignedInUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session.user.id;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getFriendlyAssistantError(error: unknown) {
  if (assistantErrorTextIncludes(error, ["GOOGLE_GENERATIVE_AI_API_KEY"])) {
    return "The dashboard assistant is unavailable because the AI provider is not configured.";
  }

  if (
    assistantErrorTextIncludes(error, [
      "quota",
      "rate limit",
      "too many requests",
      "429",
    ])
  ) {
    return "The AI provider rate limit was reached. Please wait a moment and try again.";
  }

  if (
    assistantErrorTextIncludes(error, [
      "503",
      "service unavailable",
      "overloaded",
      "temporarily unavailable",
    ])
  ) {
    return "The AI provider is temporarily unavailable. Please try again shortly.";
  }

  return "The dashboard assistant could not answer right now. Try again in a moment.";
}

function filterReferencedRecords(
  citedRecordKeys: string[],
  sourceMap: Map<string, DashboardAssistantReferencedRecord>,
) {
  const referencedRecords: DashboardAssistantReferencedRecord[] = [];
  const seen = new Set<string>();

  for (const key of citedRecordKeys) {
    if (seen.has(key)) {
      continue;
    }

    const source = sourceMap.get(key);

    if (!source) {
      continue;
    }

    seen.add(key);
    referencedRecords.push(source);
  }

  return referencedRecords;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorFieldText(error: unknown, fieldName: string) {
  if (!isRecord(error)) {
    return null;
  }

  const value = error[fieldName];

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}

function collectAssistantErrorText(error: unknown, depth = 0): string[] {
  if (depth > 2) {
    return [];
  }

  if (typeof error === "string" || typeof error === "number") {
    return [String(error)];
  }

  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(error.name, error.message);
  }

  if (isRecord(error)) {
    for (const fieldName of [
      "name",
      "message",
      "status",
      "statusCode",
      "responseStatus",
      "code",
    ]) {
      const fieldText = getErrorFieldText(error, fieldName);

      if (fieldText) {
        parts.push(fieldText);
      }
    }

    if ("cause" in error) {
      parts.push(...collectAssistantErrorText(error.cause, depth + 1));
    }

    if ("response" in error) {
      parts.push(...collectAssistantErrorText(error.response, depth + 1));
    }
  }

  return parts;
}

function assistantErrorTextIncludes(error: unknown, terms: string[]) {
  const errorText = collectAssistantErrorText(error).join(" ").toLowerCase();

  return terms.some((term) => errorText.includes(term.toLowerCase()));
}

function parsePreviousMessages(
  value: unknown,
): DashboardAssistantHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: DashboardAssistantHistoryMessage[] = [];

  for (const item of value.slice(-MAX_HISTORY_MESSAGES)) {
    const parsed = historyMessageSchema.safeParse(item);

    if (!parsed.success) {
      continue;
    }

    messages.push(parsed.data);
  }

  return messages;
}

function parsePageContext(
  value: unknown,
): DashboardAssistantPageContextInput | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = pageContextSchema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

function getConciseAssistantErrorLog(error: unknown) {
  const summary: Record<string, string> = {};
  const addField = (fieldName: string, fieldValue: string | null) => {
    if (fieldValue) {
      summary[fieldName] = fieldValue;
    }
  };

  if (error instanceof Error) {
    addField("name", error.name);
    addField("message", error.message);

    if (error.cause instanceof Error) {
      addField("causeName", error.cause.name);
      addField("causeMessage", error.cause.message);
    }
  } else if (typeof error === "string" || typeof error === "number") {
    addField("value", String(error));
  }

  if (isRecord(error)) {
    for (const fieldName of [
      "status",
      "statusCode",
      "responseStatus",
      "code",
    ]) {
      addField(fieldName, getErrorFieldText(error, fieldName));
    }
  }

  return Object.keys(summary).length > 0 ? summary : { name: "UnknownError" };
}

export async function askDashboardAssistant(
  input: DashboardAssistantActionInput,
): Promise<DashboardAssistantActionState> {
  const rawQuestion = isRecord(input) ? input.question : "";
  const parsedQuestion = questionSchema.safeParse(rawQuestion);
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : "";
  const previousMessages = parsePreviousMessages(
    isRecord(input) ? input.previousMessages : undefined,
  );
  const pageContext = parsePageContext(
    isRecord(input) ? input.pageContext : undefined,
  );

  if (!parsedQuestion.success) {
    return {
      question,
      answerMarkdown: null,
      referencedRecords: [],
      limitations: [],
      error: parsedQuestion.error.issues[0]?.message ?? "Enter a question.",
    };
  }

  const userId = await getSignedInUserId();

  try {
    const context = await buildDashboardAssistantBaseContext({
      userId,
      question: parsedQuestion.data,
      pageContext,
    });
    const answer = await generateDashboardAssistantAnswer({
      question: parsedQuestion.data,
      contextText: context.contextText,
      toolRuntime: context.toolRuntime,
      recentMessages: previousMessages,
    });
    const limitations = uniqueStrings([
      ...context.limitations,
      ...answer.limitations,
    ]);

    return {
      question: parsedQuestion.data,
      answerMarkdown: answer.answerMarkdown,
      referencedRecords: filterReferencedRecords(
        answer.citedRecordKeys,
        context.sourceMap,
      ),
      limitations,
      error: null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Dashboard assistant error",
        getConciseAssistantErrorLog(error),
      );
    }

    return {
      question: parsedQuestion.data,
      answerMarkdown: null,
      referencedRecords: [],
      limitations: [],
      error: getFriendlyAssistantError(error),
    };
  }
}
