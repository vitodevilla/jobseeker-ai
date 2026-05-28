"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { askDashboardAssistant } from "@/app/dashboard/actions";
import type { DashboardAssistantActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const quickPrompts = [
  "What should I prioritize this week?",
  "Which applications need follow-up?",
  "Which interviews are coming up?",
  "Which saved jobs seem most relevant to my profile?",
];

const initialState: DashboardAssistantActionState = {
  question: "",
  answerMarkdown: null,
  referencedRecords: [],
  limitations: [],
  error: null,
};

function formatRecordType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function DashboardAssistantCard() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [state, formAction, isPending] = useActionState(
    askDashboardAssistant,
    initialState,
  );

  function handleQuickPrompt(prompt: string) {
    setQuestion(prompt);
    textareaRef.current?.focus();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask about your saved job-search data</CardTitle>
        <CardDescription>
          The assistant can answer from saved records, but it will not change
          anything. Answers are based on available saved data.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form action={formAction} className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="dashboardAssistantQuestion"
              className="text-sm font-medium"
            >
              Question
            </label>
            <textarea
              ref={textareaRef}
              id="dashboardAssistantQuestion"
              name="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Ask what to prioritize, which applications need follow-up, or whether a saved job mentions a requirement..."
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            />
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
            {isPending ? "Asking..." : "Ask assistant"}
          </Button>
        </form>

        <div aria-live="polite" className="space-y-4">
          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          {state.answerMarkdown ? (
            <div className="space-y-4">
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {state.answerMarkdown}
              </div>

              {state.limitations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Limitations</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {state.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {state.referencedRecords.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Referenced records</p>
                  <ul className="divide-y rounded-md border">
                    {state.referencedRecords.map((record) => (
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
                            {record.description
                              ? ` · ${record.description}`
                              : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : !state.error ? (
            <p className="text-sm text-muted-foreground">
              Ask a question to get a grounded answer from your saved records.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
