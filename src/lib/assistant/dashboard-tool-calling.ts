import { tool } from "ai";
import { z } from "zod";
import { getQuestionTerms, section } from "@/lib/assistant/context-formatters";
import {
  findApplicationsNeedingAttentionContext,
  getPendingTasksContext,
  getUpcomingInterviewsContext,
  searchJobPostingsContext,
  searchResumesContext,
  type DashboardAssistantContextModuleResult,
} from "@/lib/assistant/dashboard-tools";
import type { DashboardAssistantSourceRegistry } from "@/lib/assistant/source-registry";

const noInputSchema = z.object({}).strict();
const searchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
  })
  .strict();

export type DashboardAssistantToolRuntime = {
  userId: string;
  registry: DashboardAssistantSourceRegistry;
  now: Date;
};

export type DashboardAssistantCollectedToolContext = {
  contextSections: string[];
  limitations: string[];
};

type CreateDashboardAssistantToolsInput = DashboardAssistantToolRuntime & {
  state: DashboardAssistantCollectedToolContext;
};

export function createDashboardAssistantCollectedToolContext(): DashboardAssistantCollectedToolContext {
  return {
    contextSections: [],
    limitations: [],
  };
}

function rememberToolResult(
  state: DashboardAssistantCollectedToolContext,
  result: DashboardAssistantContextModuleResult,
) {
  state.contextSections.push(result.contextSection);
  state.limitations.push(...result.limitations);
}

function buildUnavailableResult({
  title,
  emptyMessage,
  limitation,
}: {
  title: string;
  emptyMessage: string;
  limitation: string;
}): DashboardAssistantContextModuleResult {
  return {
    title,
    contextSection: section(title, [], emptyMessage),
    limitations: [limitation],
    status: "error",
  };
}

async function runReadOnlyTool({
  state,
  title,
  emptyMessage,
  limitation,
  run,
}: {
  state: DashboardAssistantCollectedToolContext;
  title: string;
  emptyMessage: string;
  limitation: string;
  run: () => Promise<DashboardAssistantContextModuleResult>;
}) {
  try {
    const result = await run();
    rememberToolResult(state, result);

    return result;
  } catch {
    const result = buildUnavailableResult({
      title,
      emptyMessage,
      limitation,
    });
    rememberToolResult(state, result);

    return result;
  }
}

function getCombinedStatus(results: DashboardAssistantContextModuleResult[]) {
  if (results.every((result) => result.status === "error")) {
    return "error";
  }

  if (results.some((result) => result.status === "error")) {
    return "partial";
  }

  if (results.some((result) => result.status === "partial")) {
    return "partial";
  }

  if (results.every((result) => result.status === "empty")) {
    return "empty";
  }

  return "ok";
}

function combineSearchResults({
  title,
  query,
  results,
}: {
  title: string;
  query: string;
  results: DashboardAssistantContextModuleResult[];
}): DashboardAssistantContextModuleResult {
  const limitations = results.flatMap((result) => result.limitations);

  return {
    title,
    contextSection: [
      `## ${title}`,
      `- Query: ${query.trim()}`,
      ...results.map((result) => result.contextSection),
    ].join("\n\n"),
    limitations,
    status: getCombinedStatus(results),
  };
}

export function createDashboardAssistantTools({
  userId,
  registry,
  now,
  state,
}: CreateDashboardAssistantToolsInput) {
  return {
    getUpcomingInterviews: tool({
      description:
        "Use when the user asks about scheduled interviews, interview prep timing, or upcoming interview obligations. Read-only.",
      inputSchema: noInputSchema,
      execute: async () =>
        runReadOnlyTool({
          state,
          title: "Upcoming Interviews",
          emptyMessage: "Upcoming interview retrieval was unavailable.",
          limitation: "Upcoming interview retrieval was unavailable.",
          run: () =>
            getUpcomingInterviewsContext({
              userId,
              registry,
              now,
              terms: [],
            }),
        }),
    }),

    getPendingTasks: tool({
      description:
        "Use when the user asks what tasks to focus on, what is due, overdue, or pending. Read-only.",
      inputSchema: noInputSchema,
      execute: async () =>
        runReadOnlyTool({
          state,
          title: "Pending Or Overdue Tasks",
          emptyMessage: "Pending task retrieval was unavailable.",
          limitation: "Pending task retrieval was unavailable.",
          run: () =>
            getPendingTasksContext({
              userId,
              registry,
              now,
              terms: [],
            }),
        }),
    }),

    findApplicationsNeedingAttention: tool({
      description:
        "Use when the user asks what to prioritize, what needs follow-up, or what applications are urgent. Read-only.",
      inputSchema: noInputSchema,
      execute: async () =>
        runReadOnlyTool({
          state,
          title: "Applications Needing Attention",
          emptyMessage: "Application attention retrieval was unavailable.",
          limitation: "Application attention retrieval was unavailable.",
          run: () =>
            findApplicationsNeedingAttentionContext({
              userId,
              registry,
              now,
              terms: [],
            }),
        }),
    }),

    searchJobPostings: tool({
      description:
        "Use when the user asks about saved jobs, job requirements, companies, technologies, Docker/containers, role fit, or job details. Searches saved job postings with keyword and semantic retrieval. Read-only.",
      inputSchema: searchInputSchema,
      execute: async ({ query }) =>
        runReadOnlyTool({
          state,
          title: "Saved Job Posting Search",
          emptyMessage: "Saved job posting retrieval was unavailable.",
          limitation: "Saved job posting retrieval was unavailable.",
          run: async () => {
            const terms = getQuestionTerms(query);
            const sharedInput = {
              userId,
              registry,
              terms,
              question: query,
            };
            const [keywordResult, semanticResult] = await Promise.all([
              searchJobPostingsContext({
                ...sharedInput,
                mode: "keyword",
              }),
              searchJobPostingsContext({
                ...sharedInput,
                mode: "semantic",
              }),
            ]);

            return combineSearchResults({
              title: "Saved Job Posting Search",
              query,
              results: [keywordResult, semanticResult],
            });
          },
        }),
    }),

    searchResumes: tool({
      description:
        "Use when the user asks about resumes, resume fit, skills in resumes, or which resume is relevant. Searches saved resumes with keyword and semantic retrieval. Read-only.",
      inputSchema: searchInputSchema,
      execute: async ({ query }) =>
        runReadOnlyTool({
          state,
          title: "Saved Resume Search",
          emptyMessage: "Saved resume retrieval was unavailable.",
          limitation: "Saved resume retrieval was unavailable.",
          run: async () => {
            const terms = getQuestionTerms(query);
            const sharedInput = {
              userId,
              registry,
              terms,
              question: query,
            };
            const [keywordResult, semanticResult] = await Promise.all([
              searchResumesContext({
                ...sharedInput,
                mode: "keyword",
              }),
              searchResumesContext({
                ...sharedInput,
                mode: "semantic",
              }),
            ]);

            return combineSearchResults({
              title: "Saved Resume Search",
              query,
              results: [keywordResult, semanticResult],
            });
          },
        }),
    }),
  };
}
