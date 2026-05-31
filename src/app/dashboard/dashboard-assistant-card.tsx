"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { askDashboardAssistant } from "@/app/dashboard/actions";
import type {
  DashboardAssistantActionState,
  DashboardAssistantHistoryMessage,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_QUESTION_LENGTH = 1500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 1200;
const pendingAssistantMessage = "Gathering saved context...";

const quickPrompts = [
  "What should I prioritize this week?",
  "Which applications need follow-up?",
  "Which interviews are coming up?",
  "Which saved jobs seem most relevant to my profile?",
];

type DashboardAssistantChatMessage =
  | {
      id: string;
      role: "user";
      content: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      status: "pending" | "complete" | "error";
      referencedRecords: DashboardAssistantActionState["referencedRecords"];
      limitations: string[];
    };

function formatRecordType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function createMessageId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function truncateHistoryContent(content: string) {
  return content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH);
}

function isHistoryMessage(
  message: DashboardAssistantHistoryMessage | null,
): message is DashboardAssistantHistoryMessage {
  return message !== null;
}

function toHistoryMessage(
  message: DashboardAssistantChatMessage,
): DashboardAssistantHistoryMessage | null {
  if (message.role === "user") {
    const content = truncateHistoryContent(message.content);

    return content ? { role: "user", content } : null;
  }

  if (message.status !== "complete") {
    return null;
  }

  const content = truncateHistoryContent(message.content);

  return content ? { role: "assistant", content } : null;
}

function getRecentHistoryMessages(
  transcript: DashboardAssistantChatMessage[],
) {
  return transcript
    .map(toHistoryMessage)
    .filter(isHistoryMessage)
    .slice(-MAX_HISTORY_MESSAGES);
}

function getQuestionValidationError(question: string) {
  if (!question) {
    return "Enter a question for the dashboard assistant.";
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return `Keep the question under ${MAX_QUESTION_LENGTH} characters.`;
  }

  return null;
}

function buildAssistantMessageFromResponse({
  id,
  response,
}: {
  id: string;
  response: DashboardAssistantActionState;
}): DashboardAssistantChatMessage {
  if (response.error) {
    return {
      id,
      role: "assistant",
      content: response.error,
      status: "error",
      referencedRecords: [],
      limitations: [],
    };
  }

  if (!response.answerMarkdown) {
    return {
      id,
      role: "assistant",
      content:
        "The dashboard assistant could not answer right now. Try again in a moment.",
      status: "error",
      referencedRecords: [],
      limitations: [],
    };
  }

  return {
    id,
    role: "assistant",
    content: response.answerMarkdown,
    status: "complete",
    referencedRecords: response.referencedRecords,
    limitations: response.limitations,
  };
}

function DashboardAssistantMessage({
  message,
}: {
  message: DashboardAssistantChatMessage;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-3">
        <div
          className={
            message.status === "error"
              ? "whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
              : "whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6"
          }
        >
          {message.content}
        </div>

        {message.status === "complete" && message.limitations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Limitations</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {message.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {message.status === "complete" &&
        message.referencedRecords.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Referenced records</p>
            <ul className="divide-y rounded-md border">
              {message.referencedRecords.map((record) => (
                <li key={record.key}>
                  <Link
                    href={record.href}
                    className="block space-y-1 p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="block font-medium text-foreground underline-offset-4 hover:underline">
                      {record.label}
                    </span>
                    <span className="block text-muted-foreground">
                      {formatRecordType(record.type)}
                      {record.description ? ` · ${record.description}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardAssistantCard() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestInFlightRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState<DashboardAssistantChatMessage[]>(
    [],
  );
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function handleQuickPrompt(prompt: string) {
    if (isPending || requestInFlightRef.current) {
      return;
    }

    setQuestion(prompt);
    setComposerError(null);
    textareaRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || requestInFlightRef.current) {
      return;
    }

    const trimmedQuestion = question.trim();
    const validationError = getQuestionValidationError(trimmedQuestion);

    if (validationError) {
      setComposerError(validationError);
      textareaRef.current?.focus();
      return;
    }

    const userMessage: DashboardAssistantChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmedQuestion,
    };
    const assistantMessageId = createMessageId("assistant");
    const previousMessages = getRecentHistoryMessages(transcript);

    requestInFlightRef.current = true;
    setTranscript((currentTranscript) => [
      ...currentTranscript,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: pendingAssistantMessage,
        status: "pending",
        referencedRecords: [],
        limitations: [],
      },
    ]);
    setQuestion("");
    setComposerError(null);
    setIsPending(true);

    try {
      const response = await askDashboardAssistant({
        question: trimmedQuestion,
        previousMessages,
      });
      const assistantMessage = buildAssistantMessageFromResponse({
        id: assistantMessageId,
        response,
      });

      setTranscript((currentTranscript) =>
        currentTranscript.map((message) =>
          message.id === assistantMessageId ? assistantMessage : message,
        ),
      );
    } catch {
      setTranscript((currentTranscript) =>
        currentTranscript.map((message) =>
          message.id === assistantMessageId
            ? {
                id: assistantMessageId,
                role: "assistant",
                content:
                  "The dashboard assistant could not answer right now. Try again in a moment.",
                status: "error",
                referencedRecords: [],
                limitations: [],
              }
            : message,
        ),
      );
    } finally {
      requestInFlightRef.current = false;
      setIsPending(false);
    }
  }

  function handleClearChat() {
    setTranscript([]);
    setComposerError(null);
    textareaRef.current?.focus();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat about your saved job-search data</CardTitle>
        <CardDescription>
          The assistant can answer from saved records, but it will not change
          anything. Answers are based on available saved data.
        </CardDescription>
        {transcript.length > 0 ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleClearChat}
            >
              Clear chat
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5">
        <div aria-live="polite" className="space-y-4">
          {transcript.length > 0 ? (
            transcript.map((message) => (
              <DashboardAssistantMessage key={message.id} message={message} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Ask a question to get a grounded answer from your saved records.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="dashboardAssistantQuestion"
              className="text-sm font-medium"
            >
              Message
            </label>
            <textarea
              ref={textareaRef}
              id="dashboardAssistantQuestion"
              name="question"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                setComposerError(null);
              }}
              rows={3}
              maxLength={MAX_QUESTION_LENGTH}
              aria-invalid={Boolean(composerError)}
              aria-describedby={
                composerError ? "dashboardAssistantComposerError" : undefined
              }
              placeholder="Ask what to prioritize, which applications need follow-up, or whether a saved job mentions a requirement..."
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {composerError ? (
              <p
                id="dashboardAssistantComposerError"
                className="text-sm text-destructive"
              >
                {composerError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto max-w-full justify-start whitespace-normal text-left leading-snug"
                disabled={isPending}
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
