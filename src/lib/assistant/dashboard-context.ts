import {
  formatDate,
  formatDateTime,
  getQuestionTerms,
} from "@/lib/assistant/context-formatters";
import {
  findApplicationsNeedingAttentionContext,
  getPendingTasksContext,
  getPrimaryResumeContext,
  getRecentApplicationsContext,
  getRecentJobPostingsContext,
  getSavedJobMatchScoresContext,
  getSavedRecordCounts,
  getUpcomingInterviewsContext,
  getUserCareerContext,
  searchJobPostingsContext,
  searchResumesContext,
  type DashboardAssistantContextModuleResult,
} from "@/lib/assistant/dashboard-tools";
import {
  createSourceRegistry,
  type ContextualAssistantReferencedRecord,
  type DashboardAssistantReferencedRecord,
} from "@/lib/assistant/source-registry";
import { getCurrentPageContext } from "@/lib/assistant/page-context";
import type { ContextualAssistantPageContextInput } from "@/lib/assistant/page-context-types";
import type { DashboardAssistantToolRuntime } from "@/lib/assistant/dashboard-tool-calling";

export type {
  ContextualAssistantReferencedRecord,
  DashboardAssistantReferencedRecord,
};

export type DashboardAssistantContextBundle = {
  contextText: string;
  sourceMap: Map<string, DashboardAssistantReferencedRecord>;
  limitations: string[];
  hasSavedRecords: boolean;
};

export type ContextualAssistantContextBundle =
  DashboardAssistantContextBundle;

export type DashboardAssistantBaseContextBundle =
  DashboardAssistantContextBundle & {
    toolRuntime: DashboardAssistantToolRuntime;
  };

export type ContextualAssistantBaseContextBundle =
  DashboardAssistantBaseContextBundle;

export type BuildDashboardAssistantContextInput = {
  userId: string;
  question: string;
  pageContext?: ContextualAssistantPageContextInput;
  now?: Date;
};

export type BuildContextualAssistantContextInput =
  BuildDashboardAssistantContextInput;

function getModuleLimitations(
  results: DashboardAssistantContextModuleResult[],
) {
  return results.flatMap((result) => result.limitations);
}

export async function buildDashboardAssistantContext({
  userId,
  question,
  now = new Date(),
}: BuildDashboardAssistantContextInput): Promise<DashboardAssistantContextBundle> {
  const terms = getQuestionTerms(question);
  const registry = createSourceRegistry();
  const sharedInput = {
    userId,
    registry,
    terms,
  };
  const timedInput = {
    ...sharedInput,
    now,
  };
  const [
    userCareerContext,
    savedRecordCounts,
    primaryResumeContext,
    upcomingInterviewsContext,
    pendingTasksContext,
    applicationsNeedingAttentionContext,
    recentApplicationsContext,
    recentJobPostingsContext,
    savedJobMatchScoresContext,
    keywordJobPostingsContext,
    keywordResumesContext,
  ] = await Promise.all([
    getUserCareerContext({ userId }),
    getSavedRecordCounts({ userId }),
    getPrimaryResumeContext(sharedInput),
    getUpcomingInterviewsContext(timedInput),
    getPendingTasksContext(timedInput),
    findApplicationsNeedingAttentionContext(timedInput),
    getRecentApplicationsContext(sharedInput),
    getRecentJobPostingsContext(sharedInput),
    getSavedJobMatchScoresContext(sharedInput),
    searchJobPostingsContext({
      ...sharedInput,
      question,
      mode: "keyword",
    }),
    searchResumesContext({
      ...sharedInput,
      question,
      mode: "keyword",
    }),
  ]);
  const [semanticJobPostingsContext, semanticResumesContext] =
    await Promise.all([
      searchJobPostingsContext({
        ...sharedInput,
        question,
        mode: "semantic",
      }),
      searchResumesContext({
        ...sharedInput,
        question,
        mode: "semantic",
      }),
    ]);
  const orderedContextModules = [
    userCareerContext,
    savedRecordCounts,
    primaryResumeContext,
    upcomingInterviewsContext,
    pendingTasksContext,
    applicationsNeedingAttentionContext,
    recentApplicationsContext,
    recentJobPostingsContext,
    savedJobMatchScoresContext,
    keywordJobPostingsContext,
    keywordResumesContext,
    semanticJobPostingsContext,
    semanticResumesContext,
  ];
  const limitations = [
    ...getModuleLimitations([
      semanticJobPostingsContext,
      semanticResumesContext,
    ]),
  ];

  if (!savedRecordCounts.hasSavedRecords) {
    limitations.push(
      "No saved job-search records were found, so the assistant can only discuss missing context.",
    );
  }

  const contextText = [
    "JobSeeker AI read-only dashboard assistant context.",
    "Use only the saved context below. Source keys identify records that may be cited.",
    `Current date: ${formatDate(now)}`,
    `Current timestamp: ${formatDateTime(now)}`,
    `Question-targeted keyword terms: ${
      terms.length > 0 ? terms.join(", ") : "none"
    }`,
    ...orderedContextModules.map((result) => result.contextSection),
  ].join("\n\n");

  return {
    contextText,
    sourceMap: registry.sourceMap,
    limitations,
    hasSavedRecords: savedRecordCounts.hasSavedRecords,
  };
}

export async function buildDashboardAssistantBaseContext({
  userId,
  question,
  pageContext,
  now = new Date(),
}: BuildDashboardAssistantContextInput): Promise<DashboardAssistantBaseContextBundle> {
  const terms = getQuestionTerms(question);
  const registry = createSourceRegistry();
  const sharedInput = {
    userId,
    registry,
    terms,
  };
  const [userCareerContext, savedRecordCounts, primaryResumeContext] =
    await Promise.all([
      getUserCareerContext({ userId }),
      getSavedRecordCounts({ userId }),
      getPrimaryResumeContext(sharedInput),
    ]);
  const currentPageContext = await getCurrentPageContext({
    ...sharedInput,
    pageContext,
    now,
  });
  const orderedContextModules = [
    userCareerContext,
    savedRecordCounts,
    primaryResumeContext,
    ...(currentPageContext ? [currentPageContext] : []),
  ];
  const limitations = currentPageContext ? [...currentPageContext.limitations] : [];

  if (!savedRecordCounts.hasSavedRecords) {
    limitations.push(
      "No saved job-search records were found, so the assistant can only discuss missing context.",
    );
  }

  const contextText = [
    "JobSeeker AI read-only dashboard assistant base context.",
    "Use this orientation plus any read-only tool results. Source keys identify records that may be cited.",
    "Current page context, when present, is saved database state only and may not include unsaved form edits.",
    `Current date: ${formatDate(now)}`,
    `Current timestamp: ${formatDateTime(now)}`,
    `Question-targeted keyword terms: ${
      terms.length > 0 ? terms.join(", ") : "none"
    }`,
    ...orderedContextModules.map((result) => result.contextSection),
  ].join("\n\n");

  return {
    contextText,
    sourceMap: registry.sourceMap,
    limitations,
    hasSavedRecords: savedRecordCounts.hasSavedRecords,
    toolRuntime: {
      userId,
      registry,
      now,
    },
  };
}

export async function buildContextualAssistantBaseContext(
  input: BuildContextualAssistantContextInput,
): Promise<ContextualAssistantBaseContextBundle> {
  return buildDashboardAssistantBaseContext(input);
}
