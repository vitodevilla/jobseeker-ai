import {
  formatDate,
  formatDateTime,
  formatResumeLine,
  formatStatus,
  formatValue,
  section,
  truncateText,
} from "@/lib/assistant/context-formatters";
import type { ContextualAssistantContextModuleResult } from "@/lib/assistant/dashboard-tools";
import { prisma } from "@/lib/prisma";
import {
  APPLICATION_NOTES_EXCERPT_LENGTH,
  buildUnavailableCurrentPageContext,
  type BuildAssistantPageContextInput,
  type ResumePageContextInput,
} from "@/lib/assistant/page-context/shared";

const RESUME_AI_FEEDBACK_EXCERPT_LENGTH = 600;
const RELATED_RESUME_APPLICATION_CONTEXT_LIMIT = 5;
const RELATED_RESUME_JOB_QUERY_LIMIT = 5;
const RELATED_RESUME_JOB_CONTEXT_LIMIT = 5;
const RELATED_RESUME_JOB_ANALYSIS_EXCERPT_LENGTH = 500;

type ResumeRelatedApplication = {
  id: string;
  status: string;
  priority: string;
  appliedAt: Date | null;
  nextActionDate: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  updatedAt: Date;
  jobPosting: {
    id: string;
    title: string;
    location: string | null;
    company: {
      id: string;
      name: string;
      industry: string | null;
    };
  };
};

type ResumeRelatedJobPosting = {
  id: string;
  title: string;
  location: string | null;
  matchScore: number | null;
  matchScoreAt: Date | null;
  matchAnalysis: string | null;
  tailoringSuggestions: string | null;
  tailoringSuggestionsAt: Date | null;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
};

type ResumeRelatedJobPostingWithContext = {
  jobPosting: ResumeRelatedJobPosting;
  hasMatch: boolean;
  hasTailoring: boolean;
};

function formatRelatedResumeApplicationLine({
  application,
  applicationKey,
  jobPostingKey,
  companyKey,
  index,
}: {
  application: ResumeRelatedApplication;
  applicationKey: string;
  jobPostingKey: string;
  companyKey: string;
  index: number;
}) {
  const notes = truncateText(
    application.notes,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );
  const rejectionReason = truncateText(
    application.rejectionReason,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );

  return [
    `- Related application ${index + 1}. Source ${applicationKey}: ${application.jobPosting.title} at ${application.jobPosting.company.name}`,
    `job source: ${jobPostingKey}`,
    `company source: ${companyKey}`,
    `status: ${formatStatus(application.status)}`,
    `priority: ${formatStatus(application.priority)}`,
    `applied: ${formatDate(application.appliedAt)}`,
    `next action: ${formatDate(application.nextActionDate)}`,
    `updated: ${formatDateTime(application.updatedAt)}`,
    rejectionReason ? `rejection reason excerpt: ${rejectionReason}` : null,
    notes ? `notes excerpt: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function getLatestRelatedResumeJobActivity({
  jobPosting,
  hasMatch,
  hasTailoring,
}: ResumeRelatedJobPostingWithContext) {
  return Math.max(
    hasMatch ? (jobPosting.matchScoreAt?.getTime() ?? 0) : 0,
    hasTailoring ? (jobPosting.tailoringSuggestionsAt?.getTime() ?? 0) : 0,
    jobPosting.updatedAt.getTime(),
  );
}

function mergeRelatedResumeJobPostings({
  matchJobPostings,
  tailoringJobPostings,
}: {
  matchJobPostings: ResumeRelatedJobPosting[];
  tailoringJobPostings: ResumeRelatedJobPosting[];
}) {
  const byId = new Map<string, ResumeRelatedJobPostingWithContext>();

  for (const jobPosting of matchJobPostings) {
    byId.set(jobPosting.id, {
      jobPosting,
      hasMatch: true,
      hasTailoring: false,
    });
  }

  for (const jobPosting of tailoringJobPostings) {
    const existing = byId.get(jobPosting.id);

    if (existing) {
      existing.hasTailoring = true;
      continue;
    }

    byId.set(jobPosting.id, {
      jobPosting,
      hasMatch: false,
      hasTailoring: true,
    });
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      getLatestRelatedResumeJobActivity(right) -
      getLatestRelatedResumeJobActivity(left),
  );
}

function formatRelatedResumeJobPostingLine({
  relatedJobPosting,
  jobPostingKey,
  companyKey,
  index,
}: {
  relatedJobPosting: ResumeRelatedJobPostingWithContext;
  jobPostingKey: string;
  companyKey: string;
  index: number;
}) {
  const { jobPosting, hasMatch, hasTailoring } = relatedJobPosting;
  const matchAnalysis = hasMatch
    ? truncateText(
        jobPosting.matchAnalysis,
        RELATED_RESUME_JOB_ANALYSIS_EXCERPT_LENGTH,
      )
    : null;
  const tailoringSuggestions = hasTailoring
    ? truncateText(
        jobPosting.tailoringSuggestions,
        RELATED_RESUME_JOB_ANALYSIS_EXCERPT_LENGTH,
      )
    : null;
  const relationTypes = [
    hasMatch ? "match analysis" : null,
    hasTailoring ? "tailoring suggestions" : null,
  ].filter(Boolean);

  return [
    `- Related saved job ${index + 1}. Source ${jobPostingKey}: ${jobPosting.title} at ${jobPosting.company.name}`,
    `company source: ${companyKey}`,
    `relation to current resume: ${relationTypes.join(" and ")}`,
    `location: ${formatValue(jobPosting.location)}`,
    hasMatch && jobPosting.matchScore !== null
      ? `saved match score: ${jobPosting.matchScore}/100`
      : null,
    hasMatch ? `match generated: ${formatDateTime(jobPosting.matchScoreAt)}` : null,
    matchAnalysis ? `saved match analysis excerpt: ${matchAnalysis}` : null,
    hasTailoring
      ? `tailoring generated: ${formatDateTime(jobPosting.tailoringSuggestionsAt)}`
      : null,
    tailoringSuggestions
      ? `saved tailoring suggestions excerpt: ${tailoringSuggestions}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export async function getCurrentResumeContext({
  userId,
  registry,
  terms,
  pageContext,
}: BuildAssistantPageContextInput & {
  pageContext: ResumePageContextInput;
}): Promise<ContextualAssistantContextModuleResult> {
  const resume = await prisma.resume.findFirst({
    where: {
      id: pageContext.id,
      userId,
    },
    select: {
      id: true,
      name: true,
      content: true,
      fileUrl: true,
      aiFeedback: true,
      aiFeedbackAt: true,
      embeddedAt: true,
      embeddingTextHash: true,
      createdAt: true,
      updatedAt: true,
      applications: {
        where: {
          userId,
        },
        include: {
          jobPosting: {
            include: {
              company: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: RELATED_RESUME_APPLICATION_CONTEXT_LIMIT,
      },
      jobPostingMatches: {
        where: {
          userId,
        },
        include: {
          company: true,
        },
        orderBy: [
          {
            matchScoreAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: RELATED_RESUME_JOB_QUERY_LIMIT,
      },
      jobPostingTailorings: {
        where: {
          userId,
        },
        include: {
          company: true,
        },
        orderBy: [
          {
            tailoringSuggestionsAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: RELATED_RESUME_JOB_QUERY_LIMIT,
      },
    },
  });

  if (!resume) {
    return buildUnavailableCurrentPageContext();
  }

  const resumeKey = registry.addResumeSource(resume);
  const aiFeedbackExcerpt = truncateText(
    resume.aiFeedback,
    RESUME_AI_FEEDBACK_EXCERPT_LENGTH,
  );
  const applicationLines =
    resume.applications.length > 0
      ? resume.applications.map((application, index) =>
          formatRelatedResumeApplicationLine({
            application,
            applicationKey: registry.addApplicationSource(application),
            jobPostingKey: registry.addJobPostingSource(
              application.jobPosting,
            ),
            companyKey: registry.addCompanySource(
              application.jobPosting.company,
            ),
            index,
          }),
        )
      : ["- Related applications using this resume: none saved."];
  const relatedJobPostings = mergeRelatedResumeJobPostings({
    matchJobPostings: resume.jobPostingMatches,
    tailoringJobPostings: resume.jobPostingTailorings,
  }).slice(0, RELATED_RESUME_JOB_CONTEXT_LIMIT);
  const relatedJobPostingLines =
    relatedJobPostings.length > 0
      ? relatedJobPostings.map((relatedJobPosting, index) =>
          formatRelatedResumeJobPostingLine({
            relatedJobPosting,
            jobPostingKey: registry.addJobPostingSource(
              relatedJobPosting.jobPosting,
            ),
            companyKey: registry.addCompanySource(
              relatedJobPosting.jobPosting.company,
            ),
            index,
          }),
        )
      : [
          "- Related saved job analyses/tailoring records tied to this resume: none saved.",
        ];
  const lines = [
    "- Current page type: resume",
    `- Page-relative phrases like "this resume", "this CV", "this profile", "this document", "current resume", and "current CV" refer to source ${resumeKey}.`,
    `- Current resume source: ${resumeKey}`,
    `- Stored PDF: ${resume.fileUrl ? "present" : "not saved"}`,
    `- Semantic data: ${
      resume.embeddedAt && resume.embeddingTextHash
        ? `present, generated ${formatDateTime(resume.embeddedAt)}`
        : "not present"
    }`,
    formatResumeLine({
      index: 1,
      sourceKey: resumeKey,
      resume,
      terms,
    }),
    aiFeedbackExcerpt
      ? `- Saved AI critique excerpt${
          resume.aiFeedbackAt
            ? ` (generated ${formatDateTime(resume.aiFeedbackAt)})`
            : ""
        }: ${aiFeedbackExcerpt}`
      : "- Saved AI critique: none saved for this resume.",
    ...applicationLines,
    ...relatedJobPostingLines,
  ];

  return {
    title: "Current Page Context",
    contextSection: section("Current Page Context", lines, ""),
    limitations: [],
    status: "ok",
  };
}
