import type { ContextualAssistantPageContextInput } from "@/lib/assistant/page-context-types";
import type { ContextualAssistantReferencedRecord } from "@/lib/assistant/source-registry";

export type { ContextualAssistantPageContextInput };
export type { ContextualAssistantReferencedRecord };

export type ContextualAssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContextualAssistantActionInput = {
  question: string;
  previousMessages?: ContextualAssistantHistoryMessage[];
  pageContext?: ContextualAssistantPageContextInput;
};

export type ContextualAssistantActionState = {
  question: string;
  answerMarkdown: string | null;
  referencedRecords: ContextualAssistantReferencedRecord[];
  limitations: string[];
  error: string | null;
};
