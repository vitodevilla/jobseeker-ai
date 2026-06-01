import type { ContextualAssistantPageContextInput } from "@/lib/assistant/contextual-assistant-types";

export type AssistantPageContextDescriptor =
  ContextualAssistantPageContextInput;

export function createJobPostingAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "jobPosting" }> {
  return {
    type: "jobPosting",
    id,
  };
}

export function createApplicationAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "application" }> {
  return {
    type: "application",
    id,
  };
}

export function createResumeAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "resume" }> {
  return {
    type: "resume",
    id,
  };
}

export function getAssistantPageContextKey(
  pageContext: AssistantPageContextDescriptor | undefined,
) {
  return pageContext ? `${pageContext.type}:${pageContext.id}` : "dashboard";
}
