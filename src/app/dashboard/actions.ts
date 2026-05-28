"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildDashboardAssistantContext } from "@/lib/assistant/dashboard-context";
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
  if (
    error instanceof Error &&
    error.message.includes("GOOGLE_GENERATIVE_AI_API_KEY")
  ) {
    return "The dashboard assistant is unavailable because the AI provider is not configured.";
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
    const context = await buildDashboardAssistantContext({
      userId,
      question: parsedQuestion.data,
    });
    const answer = await generateDashboardAssistantAnswer({
      question: parsedQuestion.data,
      contextText: context.contextText,
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
    return {
      question: parsedQuestion.data,
      answerMarkdown: null,
      referencedRecords: [],
      limitations: [],
      error: getFriendlyAssistantError(error),
    };
  }
}
