"use client";

import { AssistantChatCard } from "@/components/assistant-chat-card";

const quickPrompts = [
  "What should I prioritize this week?",
  "Which applications need follow-up?",
  "Which interviews are coming up?",
  "Which saved jobs seem most relevant to my profile?",
];

export function DashboardAssistantCard() {
  return (
    <AssistantChatCard
      title="Chat about your saved job-search data"
      description="The assistant can answer from saved records, but it will not change anything. Answers are based on available saved data."
      quickPrompts={quickPrompts}
    />
  );
}
