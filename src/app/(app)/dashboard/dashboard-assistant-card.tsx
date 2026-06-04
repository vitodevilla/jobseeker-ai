"use client";

import { AssistantChatCard } from "@/components/assistant-chat-card";

const quickPrompts = [
  "What should I focus on today?",
  "Which follow-ups need attention?",
  "Which interviews should I prepare for?",
  "What is my next best action?",
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
