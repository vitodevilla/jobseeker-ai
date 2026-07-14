"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { askContextualAssistant } from "@/app/assistant/actions";
import type {
  ContextualAssistantActionState,
  ContextualAssistantHistoryMessage,
  ContextualAssistantPageContextInput,
} from "@/lib/assistant/contextual-assistant-types";
import { getAssistantPageContextKey } from "@/lib/assistant/page-context-routing";
import { cn } from "@/lib/utils";
import { AiOutputPanel, AiSectionCard } from "@/components/ai-section-card";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_QUESTION_LENGTH = 1500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 1200;
const pendingAssistantMessage = "Checking saved records...";

type AssistantChatCardProps = {
  title: string;
  description: string;
  quickPrompts: string[];
  pageContext?: ContextualAssistantPageContextInput;
};

type AssistantChatPanelProps = {
  quickPrompts: string[];
  pageContext?: ContextualAssistantPageContextInput;
  resetKey?: string;
  className?: string;
  transcriptClassName?: string;
};

type AssistantChatMessage =
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
      referencedRecords: ContextualAssistantActionState["referencedRecords"];
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
  message: ContextualAssistantHistoryMessage | null,
): message is ContextualAssistantHistoryMessage {
  return message !== null;
}

function toHistoryMessage(
  message: AssistantChatMessage,
): ContextualAssistantHistoryMessage | null {
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

function getRecentHistoryMessages(transcript: AssistantChatMessage[]) {
  return transcript
    .map(toHistoryMessage)
    .filter(isHistoryMessage)
    .slice(-MAX_HISTORY_MESSAGES);
}

function getQuestionValidationError(question: string) {
  if (!question) {
    return "Enter a question for the assistant.";
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
  response: ContextualAssistantActionState;
}): AssistantChatMessage {
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
        "The assistant could not answer right now. Try again in a moment.",
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

function AssistantChatMessageView({
  message,
}: {
  message: AssistantChatMessage;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="min-w-0 max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-lg bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[92%] space-y-3 wrap-break-word">
        {message.status === "complete" ? (
          <AiOutputPanel caption={null}>
            <MarkdownContent>{message.content}</MarkdownContent>
          </AiOutputPanel>
        ) : (
          <div
            className={
              message.status === "error"
                ? "whitespace-pre-wrap wrap-break-word rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive"
                : "whitespace-pre-wrap wrap-break-word rounded-md border border-[#C8D6E6] bg-[#F2F6FB]/70 p-3.5 text-sm leading-6 text-[#334F70] dark:border-[#4F739F]/60 dark:bg-[#223449]/30 dark:text-[#D6E2EF] sm:p-4"
            }
          >
            {message.content}
          </div>
        )}

        {message.status === "complete" && message.limitations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Limitations</p>
            <ul className="list-disc space-y-1.5 wrap-break-word pl-5 text-sm text-muted-foreground">
              {message.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {message.status === "complete" &&
        message.referencedRecords.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sources used</p>
            <ul className="divide-y rounded-md border bg-card">
              {message.referencedRecords.map((record) => (
                <li key={record.key}>
                  <Link
                    href={record.href}
                    className="block min-w-0 space-y-1 p-2.5 text-sm transition-colors hover:bg-muted/50 sm:p-3"
                  >
                    <span className="block wrap-break-word font-medium text-foreground underline-offset-4 hover:underline">
                      {record.label}
                    </span>
                    <span className="block wrap-break-word text-muted-foreground">
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

function AssistantChatPanelState({
  quickPrompts,
  pageContext,
  className,
  transcriptClassName,
}: Omit<AssistantChatPanelProps, "resetKey">) {
  const textareaId = useId();
  const composerErrorId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);
  const isComposingRef = useRef(false);
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState<AssistantChatMessage[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const scrollElement = transcriptScrollRef.current;

    if (!scrollElement) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [transcript]);

  function handleQuickPrompt(prompt: string) {
    if (isPending || requestInFlightRef.current) {
      return;
    }

    setQuestion(prompt);
    setComposerError(null);
    textareaRef.current?.focus();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    if (isComposingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (isPending || requestInFlightRef.current || !question.trim()) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
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

    const userMessage: AssistantChatMessage = {
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
      const response = await askContextualAssistant({
        question: trimmedQuestion,
        previousMessages,
        pageContext,
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
                  "The assistant could not answer right now. Try again in a moment.",
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
    <div className={cn("flex flex-col gap-4 sm:gap-5", className)}>
      {transcript.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleClearChat}
          >
            Clear chat
          </Button>
        </div>
      ) : null}

      <div
        ref={transcriptScrollRef}
        aria-live="polite"
        className={cn(
          "max-h-[28rem] space-y-3 overflow-y-auto pr-1 sm:space-y-4 md:max-h-[32rem]",
          transcriptClassName,
        )}
      >
        {transcript.length > 0 ? (
          transcript.map((message) => (
            <AssistantChatMessageView key={message.id} message={message} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask a question or choose a prompt to get an answer grounded in your
            saved records.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
        <div className="space-y-2">
          <label htmlFor={textareaId} className="text-sm font-medium">
            Ask
          </label>
          <Textarea
            ref={textareaRef}
            id={textareaId}
            name="question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setComposerError(null);
            }}
            onKeyDown={handleTextareaKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            rows={3}
            maxLength={MAX_QUESTION_LENGTH}
            aria-invalid={Boolean(composerError)}
            aria-describedby={composerError ? composerErrorId : undefined}
            placeholder="Ask what to prioritize, which records need attention, or whether a saved job mentions a requirement..."
            className="min-h-20 sm:min-h-24"
          />
          {composerError ? (
            <p id={composerErrorId} className="text-sm text-destructive">
              {composerError}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-8 max-w-full justify-start whitespace-normal text-left leading-snug"
              disabled={isPending}
              onClick={() => handleQuickPrompt(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>

        <Button
          type="submit"
          variant="ai"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}

export function AssistantChatPanel({
  resetKey,
  ...props
}: AssistantChatPanelProps) {
  return (
    <AssistantChatPanelState
      key={resetKey ?? getAssistantPageContextKey(props.pageContext)}
      {...props}
    />
  );
}

export function AssistantChatCard({
  title,
  description,
  quickPrompts,
  pageContext,
}: AssistantChatCardProps) {
  return (
    <AiSectionCard title={title} description={description}>
      <AssistantChatPanel quickPrompts={quickPrompts} pageContext={pageContext} />
    </AiSectionCard>
  );
}
