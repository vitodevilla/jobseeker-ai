import {
  formatJobPostingLine,
  section,
} from "@/lib/assistant/context-formatters";
import type { ContextualAssistantContextModuleResult } from "@/lib/assistant/dashboard-tools";
import { prisma } from "@/lib/prisma";
import {
  buildUnavailableCurrentPageContext,
  type BuildAssistantPageContextInput,
  type JobPostingPageContextInput,
} from "@/lib/assistant/page-context/shared";

export async function getCurrentJobPostingContext({
  userId,
  registry,
  terms,
  pageContext,
}: BuildAssistantPageContextInput & {
  pageContext: JobPostingPageContextInput;
}): Promise<ContextualAssistantContextModuleResult> {
  const jobPosting = await prisma.jobPosting.findFirst({
    where: {
      id: pageContext.id,
      userId,
    },
    include: {
      company: true,
    },
  });

  if (!jobPosting) {
    return buildUnavailableCurrentPageContext();
  }

  const jobPostingKey = registry.addJobPostingSource(jobPosting);
  const companyKey = registry.addCompanySource(jobPosting.company);
  const lines = [
    "- Current page type: job posting",
    `- Page-relative phrases like "this job", "this posting", and "this role" refer to source ${jobPostingKey}.`,
    `- Company source: ${companyKey}`,
    formatJobPostingLine({
      index: 1,
      sourceKey: jobPostingKey,
      companyKey,
      jobPosting,
      terms,
    }),
  ];

  return {
    title: "Current Page Context",
    contextSection: section("Current Page Context", lines, ""),
    limitations: [],
    status: "ok",
  };
}
