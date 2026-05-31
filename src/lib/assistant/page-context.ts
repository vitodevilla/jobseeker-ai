import {
  formatJobPostingLine,
  section,
} from "@/lib/assistant/context-formatters";
import type { DashboardAssistantContextModuleResult } from "@/lib/assistant/dashboard-tools";
import type { DashboardAssistantPageContextInput } from "@/lib/assistant/page-context-types";
import type { DashboardAssistantSourceRegistry } from "@/lib/assistant/source-registry";
import { prisma } from "@/lib/prisma";

type BuildAssistantPageContextInput = {
  userId: string;
  registry: DashboardAssistantSourceRegistry;
  terms: string[];
  pageContext?: DashboardAssistantPageContextInput;
};

function buildUnavailableCurrentPageContext(): DashboardAssistantContextModuleResult {
  const limitation = "Current page context could not be loaded or was unavailable.";

  return {
    title: "Current Page Context",
    contextSection: section("Current Page Context", [], limitation),
    limitations: [limitation],
    status: "empty",
  };
}

async function getCurrentJobPostingContext({
  userId,
  registry,
  terms,
  pageContext,
}: BuildAssistantPageContextInput & {
  pageContext: DashboardAssistantPageContextInput;
}): Promise<DashboardAssistantContextModuleResult> {
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

export async function getCurrentPageContext({
  pageContext,
  ...input
}: BuildAssistantPageContextInput): Promise<DashboardAssistantContextModuleResult | null> {
  if (!pageContext) {
    return null;
  }

  if (pageContext.type === "jobPosting") {
    return getCurrentJobPostingContext({
      ...input,
      pageContext,
    });
  }

  return buildUnavailableCurrentPageContext();
}
