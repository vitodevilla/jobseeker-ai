"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AssistantChatPanel } from "@/components/assistant-chat-card";
import { Button } from "@/components/ui/button";
import { resolveAssistantPageContextFromPathname } from "@/lib/assistant/page-context-routing";

const shellQuickPrompts = [
  "What should I prioritize this week?",
  "What should I know about this page?",
  "Which records need follow-up?",
  "What risks should I watch for?",
];

export function AssistantShell() {
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const pageContext = resolveAssistantPageContextFromPathname(pathname);
  const resetKey = pathname ?? "unknown-route";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      {!open ? (
        <Button
          type="button"
          aria-label="Open assistant"
          className="fixed right-4 bottom-4 z-40 h-11 rounded-full px-4 shadow-lg sm:right-6 sm:bottom-6"
          onClick={() => setOpen(true)}
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
            onClick={() => setOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l bg-background shadow-xl sm:max-w-md"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b p-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold">
                  Assistant
                </h2>
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  Ask about your saved job-search data. I can use the current
                  page when available, but I cannot see unsaved edits or change
                  anything.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 p-4">
              <AssistantChatPanel
                quickPrompts={shellQuickPrompts}
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
