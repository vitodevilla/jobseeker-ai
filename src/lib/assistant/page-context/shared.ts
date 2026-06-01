import { section } from "@/lib/assistant/context-formatters";
import type { ContextualAssistantContextModuleResult } from "@/lib/assistant/dashboard-tools";
import type { ContextualAssistantPageContextInput } from "@/lib/assistant/page-context-types";
import type { ContextualAssistantSourceRegistry } from "@/lib/assistant/source-registry";

export const APPLICATION_NOTES_EXCERPT_LENGTH = 300;

export type JobPostingPageContextInput = Extract<
  ContextualAssistantPageContextInput,
  { type: "jobPosting" }
>;

export type ApplicationPageContextInput = Extract<
  ContextualAssistantPageContextInput,
  { type: "application" }
>;

export type ResumePageContextInput = Extract<
  ContextualAssistantPageContextInput,
  { type: "resume" }
>;

export type BuildAssistantPageContextInput = {
  userId: string;
  registry: ContextualAssistantSourceRegistry;
  terms: string[];
  now?: Date;
  pageContext?: ContextualAssistantPageContextInput;
};

export function buildUnavailableCurrentPageContext(): ContextualAssistantContextModuleResult {
  const limitation = "Current page context could not be loaded or was unavailable.";

  return {
    title: "Current Page Context",
    contextSection: section("Current Page Context", [], limitation),
    limitations: [limitation],
    status: "empty",
  };
}
