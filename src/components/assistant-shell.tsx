"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AssistantChatPanel } from "@/components/assistant-chat-card";
import { Button } from "@/components/ui/button";
import { resolveAssistantPageContextFromPathname } from "@/lib/assistant/page-context-routing";

type AssistantShellPageContext = ReturnType<
  typeof resolveAssistantPageContextFromPathname
>;

const generalAssistantShellQuickPrompts = [
  "What should I prioritize this week?",
  "Which records need follow-up?",
  "Which interviews or tasks are coming up?",
  "What risks should I watch for?",
];

const jobPostingAssistantShellQuickPrompts = [
  "Does this job mention Docker or containers?",
  "Which resume fits this job best?",
  "What are the risks in this role?",
  "How should I prepare for this opportunity?",
];

const applicationAssistantShellQuickPrompts = [
  "What is the current status and next step?",
  "What tasks or interviews are tied to this application?",
  "What should I prepare for next?",
  "What risks should I watch for in this application?",
];

const resumeAssistantShellQuickPrompts = [
  "What are the strongest signals in this resume?",
  "What gaps should I watch for against my target role?",
  "Which saved jobs seem most relevant to this resume?",
  "Where has this resume been used in my applications?",
];

function getAssistantShellQuickPrompts(pageContext: AssistantShellPageContext) {
  if (pageContext?.type === "jobPosting") {
    return jobPostingAssistantShellQuickPrompts;
  }

  if (pageContext?.type === "application") {
    return applicationAssistantShellQuickPrompts;
  }

  if (pageContext?.type === "resume") {
    return resumeAssistantShellQuickPrompts;
  }

  return generalAssistantShellQuickPrompts;
}

function getAssistantShellContextLabel(pageContext: AssistantShellPageContext) {
  if (pageContext?.type === "jobPosting") {
    return "Context: Current job posting";
  }

  if (pageContext?.type === "application") {
    return "Context: Current application";
  }

  if (pageContext?.type === "resume") {
    return "Context: Current resume";
  }

  return "Context: General saved job-search data";
}

export function AssistantShell() {
  const pathname = usePathname();
  const drawerId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const pageContext = resolveAssistantPageContextFromPathname(pathname);
  const contextLabel = getAssistantShellContextLabel(pageContext);
  const quickPrompts = getAssistantShellQuickPrompts(pageContext);
  const resetKey = pathname ?? "unknown-route";

  const openAssistant = useCallback(() => {
    setOpen(true);

    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
    }

    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      closeButtonRef.current?.focus();
    });
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);

    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
    }

    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      openButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAssistant();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAssistant, open]);

  return (
    <>
      {!open ? (
        <Button
          ref={openButtonRef}
          type="button"
          aria-label="Open assistant"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={drawerId}
          className="fixed right-4 bottom-4 z-40 h-11 rounded-full px-4 shadow-lg sm:right-6 sm:bottom-6"
          onClick={openAssistant}
        >
          <MessageCircle aria-hidden="true" />
          <span className="hidden sm:inline">Assistant</span>
        </Button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/15"
            onClick={closeAssistant}
          />

          <aside
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="absolute inset-y-0 right-0 flex max-h-dvh w-full flex-col overflow-hidden border-l bg-background shadow-xl sm:max-w-md"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b p-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold">
                  Assistant
                </h2>
                <p className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {contextLabel}
                </p>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm text-muted-foreground"
                >
                  Ask about your saved job-search data. I can use the current
                  page when available, but I cannot see unsaved edits or change
                  anything.
                </p>
              </div>

              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close assistant"
                onClick={closeAssistant}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <AssistantChatPanel
                quickPrompts={quickPrompts}
                pageContext={pageContext}
                resetKey={resetKey}
                className="h-full min-h-0"
                transcriptClassName="min-h-0 flex-1 max-h-none md:max-h-none"
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
