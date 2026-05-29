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
  type DashboardAssistantReferencedRecord,
} from "@/lib/assistant/source-registry";

export type { DashboardAssistantReferencedRecord };

export type DashboardAssistantContextBundle = {
  contextText: string;
  sourceMap: Map<string, DashboardAssistantReferencedRecord>;
  limitations: string[];
  hasSavedRecords: boolean;
};

type BuildDashboardAssistantContextInput = {
  userId: string;
  question: string;
  now?: Date;
};

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
