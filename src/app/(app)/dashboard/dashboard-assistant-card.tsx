"use client";

import { AssistantChatCard } from "@/components/assistant-chat-card";

const quickPrompts = [
  "Build today's job search plan.",
  "Which follow-ups need attention?",
  "How should I prepare for my next interview?",
  "Which applications look stalled?",
];

export function DashboardAssistantCard() {
  return (
    <AssistantChatCard
      title="Ask JobSeeker AI what to do next"
      description="Get a read-only answer grounded in your saved applications, tasks, interviews, resumes, and jobs. The assistant will not change anything."
      quickPrompts={quickPrompts}
    />
  );
}
