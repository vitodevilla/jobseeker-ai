import type { ContextualAssistantContextModuleResult } from "@/lib/assistant/dashboard-tools";
import { getCurrentApplicationContext } from "@/lib/assistant/page-context/application-context";
import { getCurrentJobPostingContext } from "@/lib/assistant/page-context/job-posting-context";
import { getCurrentResumeContext } from "@/lib/assistant/page-context/resume-context";
import {
  buildUnavailableCurrentPageContext,
  type BuildAssistantPageContextInput,
} from "@/lib/assistant/page-context/shared";

export async function getCurrentPageContext({
  pageContext,
  ...input
}: BuildAssistantPageContextInput): Promise<ContextualAssistantContextModuleResult | null> {
  if (!pageContext) {
    return null;
  }

  if (pageContext.type === "jobPosting") {
    return getCurrentJobPostingContext({
      ...input,
      pageContext,
    });
  }

  if (pageContext.type === "application") {
    return getCurrentApplicationContext({
      ...input,
      pageContext,
    });
  }

  if (pageContext.type === "resume") {
    return getCurrentResumeContext({
      ...input,
      pageContext,
    });
  }

  return buildUnavailableCurrentPageContext();
}
