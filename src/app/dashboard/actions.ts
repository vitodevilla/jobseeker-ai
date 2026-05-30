"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildDashboardAssistantBaseContext } from "@/lib/assistant/dashboard-context";
import type { DashboardAssistantReferencedRecord } from "@/lib/assistant/dashboard-context";
import { generateDashboardAssistantAnswer } from "@/lib/ai/dashboard-assistant";
import { auth } from "@/lib/auth";

const MAX_QUESTION_LENGTH = 1500;

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
  _previousState: DashboardAssistantActionState,
  formData: FormData,
): Promise<DashboardAssistantActionState> {
  const rawQuestion = formData.get("question");
  const parsedQuestion = questionSchema.safeParse(rawQuestion);
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : "";

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
    });
    const answer = await generateDashboardAssistantAnswer({
      question: parsedQuestion.data,
      contextText: context.contextText,
      toolRuntime: context.toolRuntime,
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
