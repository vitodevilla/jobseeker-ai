import { prisma } from "@/lib/prisma";
import {
  searchJobPostingsBySemanticQuery,
  searchResumesBySemanticQuery,
} from "@/lib/retrieval/semantic-search";
import type { Prisma } from "@/generated/prisma";

const UPCOMING_INTERVIEW_LIMIT = 5;
const PENDING_TASK_LIMIT = 8;
const APPLICATION_ATTENTION_LIMIT = 6;
const RECENT_APPLICATION_LIMIT = 6;
const RECENT_JOB_POSTING_LIMIT = 6;
const SCORED_JOB_POSTING_LIMIT = 5;
const KEYWORD_RESULT_LIMIT = 5;
const SEMANTIC_RESULT_LIMIT = 3;
const RESUME_EXCERPT_LENGTH = 900;
const JOB_DESCRIPTION_EXCERPT_LENGTH = 700;
const NOTES_EXCERPT_LENGTH = 300;
const ANALYSIS_EXCERPT_LENGTH = 500;
const QUERY_TERM_LIMIT = 8;

const CLOSED_APPLICATION_STATUSES = [
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const;

const PRIORITY_APPLICATION_STATUSES = [
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
] as const;

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "all",
  "and",
  "any",
  "are",
  "around",
  "based",
  "been",
  "before",
  "best",
  "can",
  "could",
  "current",
  "data",
  "does",
  "fit",
  "fits",
  "from",
  "have",
  "how",
  "into",
  "job",
  "jobs",
  "knowledge",
  "look",
  "looks",
  "need",
  "needs",
  "next",
  "posting",
  "postings",
  "profile",
  "relevant",
  "require",
  "required",
  "requires",
  "resume",
  "resumes",
  "saved",
  "seem",
  "should",
  "show",
  "that",
  "the",
  "their",
  "there",
  "this",
  "week",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

export type DashboardAssistantSourceType =
  | "jobPosting"
  | "resume"
  | "application"
  | "task"
  | "interview"
  | "company"
  | "coverLetter";

export type DashboardAssistantReferencedRecord = {
  key: string;
  type: DashboardAssistantSourceType;
  label: string;
  href: string;
  description: string | null;
};

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

type SourceInput = {
  type: DashboardAssistantSourceType;
  id: string;
  label: string;
  href: string;
  description?: string | null;
};

type CompanySourceInput = {
  id: string;
  name: string;
  industry?: string | null;
};

type JobPostingSourceInput = {
  id: string;
  title: string;
  company: CompanySourceInput;
  location?: string | null;
};

type ResumeSourceInput = {
  id: string;
  name: string;
};

type ApplicationSourceInput = {
  id: string;
  jobPosting: JobPostingSourceInput;
};

type TaskSourceInput = {
  id: string;
  title: string;
};

type InterviewSourceInput = {
  id: string;
  type: string;
  application: ApplicationSourceInput;
};

function normalizeText(value: string | null | undefined) {
  return value?.replaceAll("\r\n", "\n").replace(/\s+/g, " ").trim() ?? "";
}

function truncateText(value: string | null | undefined, maxLength: number) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function excerptAroundTerms(
  value: string | null | undefined,
  terms: string[],
  maxLength: number,
) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (text.length <= maxLength) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const firstMatch = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const anchor = firstMatch ?? 0;
  const start = Math.max(0, anchor - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "not set";
}

function formatDateTime(date: Date | null | undefined) {
  return date ? date.toISOString() : "not set";
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "not set";
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "not set";
  }

  return value.toString();
}

function formatSalary(jobPosting: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}) {
  const salaryMin = jobPosting.salaryMin ?? null;
  const salaryMax = jobPosting.salaryMax ?? null;
  const { salaryCurrency } = jobPosting;

  if (salaryMin === null && salaryMax === null) {
    return "not set";
  }

  const currency = salaryCurrency ? ` ${salaryCurrency}` : "";

  if (salaryMin !== null && salaryMax !== null) {
    return `${salaryMin}-${salaryMax}${currency}`;
  }

  if (salaryMin !== null) {
    return `from ${salaryMin}${currency}`;
  }

  return `up to ${salaryMax}${currency}`;
}

function getQuestionTerms(question: string) {
  const tokens = question.match(/[A-Za-z0-9][A-Za-z0-9+#.-]*/g) ?? [];
  const terms: string[] = [];

  for (const token of tokens) {
    const term = token
      .toLowerCase()
      .replace(/^[^a-z0-9+#.]+|[^a-z0-9+#.]+$/g, "");

    if (!term || STOP_WORDS.has(term)) {
      continue;
    }

    if (term.length < 3 && !/[+#.]/.test(term)) {
      continue;
    }

    if (!terms.includes(term)) {
      terms.push(term);
    }

    if (terms.length >= QUERY_TERM_LIMIT) {
      break;
    }
  }

  return terms;
}

function createSourceRegistry() {
  const sourceMap = new Map<string, DashboardAssistantReferencedRecord>();

  function addSource({ type, id, label, href, description }: SourceInput) {
    const key = `${type}:${id}`;

    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        key,
        type,
        label,
        href,
        description: description ?? null,
      });
    }

    return key;
  }

  function addCompanySource(company: CompanySourceInput) {
    return addSource({
      type: "company",
      id: company.id,
      label: company.name,
      href: `/companies/${company.id}/edit`,
      description: company.industry,
    });
  }

  function addJobPostingSource(jobPosting: JobPostingSourceInput) {
    addCompanySource(jobPosting.company);

    return addSource({
      type: "jobPosting",
      id: jobPosting.id,
      label: `${jobPosting.title} at ${jobPosting.company.name}`,
      href: `/job-postings/${jobPosting.id}/edit`,
      description: jobPosting.location ?? jobPosting.company.industry ?? null,
    });
  }

  function addResumeSource(resume: ResumeSourceInput) {
    return addSource({
      type: "resume",
      id: resume.id,
      label: resume.name,
      href: `/resumes/${resume.id}/edit`,
    });
  }

  function addApplicationSource(application: ApplicationSourceInput) {
    addJobPostingSource(application.jobPosting);

    return addSource({
      type: "application",
      id: application.id,
      label: `${application.jobPosting.title} at ${application.jobPosting.company.name}`,
      href: `/applications/${application.id}/edit`,
      description: "Application",
    });
  }

  function addTaskSource(task: TaskSourceInput) {
    return addSource({
      type: "task",
      id: task.id,
      label: task.title,
      href: `/tasks/${task.id}/edit`,
    });
  }

  function addInterviewSource(interview: InterviewSourceInput) {
    addApplicationSource(interview.application);

    return addSource({
      type: "interview",
      id: interview.id,
      label: `${formatStatus(interview.type)} interview for ${interview.application.jobPosting.title}`,
      href: `/interviews/${interview.id}/edit`,
      description: interview.application.jobPosting.company.name,
    });
  }

  return {
    sourceMap,
    addCompanySource,
    addJobPostingSource,
    addResumeSource,
    addApplicationSource,
    addTaskSource,
    addInterviewSource,
  };
}

function section(title: string, lines: string[], emptyMessage: string) {
  return [`## ${title}`, lines.length > 0 ? lines.join("\n") : `- ${emptyMessage}`].join(
    "\n",
  );
}

function buildJobPostingKeywordWhere(
  userId: string,
  terms: string[],
): Prisma.JobPostingWhereInput {
  return {
    userId,
    OR: terms.flatMap((term) => [
      {
        title: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        description: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        location: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        seniorityLevel: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        salaryCurrency: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        url: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        company: {
          name: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
      },
      {
        company: {
          industry: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
      },
      {
        company: {
          notes: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
      },
    ]),
  };
}

function buildResumeKeywordWhere(
  userId: string,
  terms: string[],
): Prisma.ResumeWhereInput {
  return {
    userId,
    OR: terms.flatMap((term) => [
      {
        name: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
      {
        content: {
          contains: term,
          mode: "insensitive" as const,
        },
      },
    ]),
  };
}

function formatJobPostingLine({
  index,
  sourceKey,
  companyKey,
  jobPosting,
  terms,
  similarity,
}: {
  index: number;
  sourceKey: string;
  companyKey: string;
  jobPosting: {
    title: string;
    description: string | null;
    location: string | null;
    workMode: string | null;
    seniorityLevel: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    deadline: Date | null;
    savedAt: Date;
    aiSummary?: string | null;
    matchScore?: number | null;
    matchAnalysis?: string | null;
    company: {
      name: string;
      industry: string | null;
      notes?: string | null;
    };
  };
  terms: string[];
  similarity?: number;
}) {
  const descriptionSnippet = excerptAroundTerms(
    jobPosting.description,
    terms,
    JOB_DESCRIPTION_EXCERPT_LENGTH,
  );
  const companyNotes = truncateText(jobPosting.company.notes, NOTES_EXCERPT_LENGTH);
  const aiSummary = truncateText(jobPosting.aiSummary, ANALYSIS_EXCERPT_LENGTH);
  const matchAnalysis = truncateText(
    jobPosting.matchAnalysis,
    ANALYSIS_EXCERPT_LENGTH,
  );
  const parts = [
    `${index}. Source ${sourceKey}: ${jobPosting.title} at ${jobPosting.company.name} (company source ${companyKey})`,
    `location: ${formatValue(jobPosting.location)}`,
    `work mode: ${formatStatus(jobPosting.workMode)}`,
    `seniority: ${formatValue(jobPosting.seniorityLevel)}`,
    `salary: ${formatSalary(jobPosting)}`,
    `deadline: ${formatDate(jobPosting.deadline)}`,
    `saved: ${formatDate(jobPosting.savedAt)}`,
  ];

  if (similarity !== undefined) {
    parts.push(`semantic similarity: ${Math.round(similarity * 100)}%`);
  }

  if (jobPosting.matchScore !== undefined && jobPosting.matchScore !== null) {
    parts.push(`saved match score: ${jobPosting.matchScore}/100`);
  }

  if (descriptionSnippet) {
    parts.push(`description excerpt: ${descriptionSnippet}`);
  }

  if (aiSummary) {
    parts.push(`saved AI summary excerpt: ${aiSummary}`);
  }

  if (matchAnalysis) {
    parts.push(`saved match analysis excerpt: ${matchAnalysis}`);
  }

  if (companyNotes) {
    parts.push(`company notes excerpt: ${companyNotes}`);
  }

  return `- ${parts.join("; ")}`;
}

function formatResumeLine({
  index,
  sourceKey,
  resume,
  terms,
  similarity,
}: {
  index: number;
  sourceKey: string;
  resume: {
    name: string;
    content: string | null;
    updatedAt?: Date;
    createdAt?: Date;
    aiFeedbackAt?: Date | null;
  };
  terms: string[];
  similarity?: number;
}) {
  const contentExcerpt = excerptAroundTerms(
    resume.content,
    terms,
    RESUME_EXCERPT_LENGTH,
  );
  const parts = [
    `${index}. Source ${sourceKey}: ${resume.name}`,
    resume.updatedAt ? `updated: ${formatDate(resume.updatedAt)}` : null,
    resume.createdAt ? `created: ${formatDate(resume.createdAt)}` : null,
    resume.aiFeedbackAt
      ? `AI critique last generated: ${formatDate(resume.aiFeedbackAt)}`
      : null,
    similarity !== undefined
      ? `semantic similarity: ${Math.round(similarity * 100)}%`
      : null,
    contentExcerpt ? `content excerpt: ${contentExcerpt}` : null,
  ].filter(Boolean);

  return `- ${parts.join("; ")}`;
}

function uniqueById<T extends { id: string }>(records: T[]) {
  const seen = new Set<string>();
  const uniqueRecords: T[] = [];

  for (const record of records) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      uniqueRecords.push(record);
    }
  }

  return uniqueRecords;
}

export async function buildDashboardAssistantContext({
  userId,
  question,
  now = new Date(),
}: BuildDashboardAssistantContextInput): Promise<DashboardAssistantContextBundle> {
  const terms = getQuestionTerms(question);
  const registry = createSourceRegistry();
  const limitations: string[] = [];
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const keywordJobPostingsPromise =
    terms.length > 0
      ? prisma.jobPosting.findMany({
          where: buildJobPostingKeywordWhere(userId, terms),
          include: {
            company: true,
          },
          orderBy: {
            savedAt: "desc",
          },
          take: KEYWORD_RESULT_LIMIT,
        })
      : Promise.resolve([]);

  const keywordResumesPromise =
    terms.length > 0
      ? prisma.resume.findMany({
          where: buildResumeKeywordWhere(userId, terms),
          orderBy: {
            updatedAt: "desc",
          },
          take: KEYWORD_RESULT_LIMIT,
        })
      : Promise.resolve([]);

  const [
    user,
    counts,
    upcomingInterviews,
    pendingTasks,
    applicationsNeedingAttention,
    recentApplications,
    recentJobPostings,
    scoredJobPostings,
    keywordJobPostings,
    keywordResumes,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        targetRole: true,
        targetLocations: true,
        yearsOfExperience: true,
        currentRole: true,
        preferredWorkMode: true,
        primaryResume: {
          select: {
            id: true,
            name: true,
            content: true,
            updatedAt: true,
            createdAt: true,
            aiFeedbackAt: true,
          },
        },
      },
    }),
    Promise.all([
      prisma.company.count({ where: { userId } }),
      prisma.jobPosting.count({ where: { userId } }),
      prisma.resume.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.task.count({ where: { userId } }),
      prisma.interview.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { userId } }),
    ]).then(
      ([
        companies,
        jobPostings,
        resumes,
        applications,
        tasks,
        interviews,
        coverLetters,
      ]) => ({
        companies,
        jobPostings,
        resumes,
        applications,
        tasks,
        interviews,
        coverLetters,
      }),
    ),
    prisma.interview.findMany({
      where: {
        userId,
        scheduledAt: {
          gte: now,
        },
      },
      include: {
        application: {
          include: {
            jobPosting: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: UPCOMING_INTERVIEW_LIMIT,
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: "PENDING",
      },
      include: {
        application: {
          include: {
            jobPosting: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          dueAt: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: PENDING_TASK_LIMIT,
    }),
    prisma.application.findMany({
      where: {
        userId,
        status: {
          notIn: [...CLOSED_APPLICATION_STATUSES],
        },
        OR: [
          {
            nextActionDate: {
              lte: sevenDaysFromNow,
            },
          },
          {
            priority: "HIGH",
          },
          {
            status: {
              in: [...PRIORITY_APPLICATION_STATUSES],
            },
          },
        ],
      },
      include: {
        jobPosting: {
          include: {
            company: true,
          },
        },
        resume: true,
      },
      orderBy: [
        {
          nextActionDate: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: APPLICATION_ATTENTION_LIMIT,
    }),
    prisma.application.findMany({
      where: {
        userId,
      },
      include: {
        jobPosting: {
          include: {
            company: true,
          },
        },
        resume: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: RECENT_APPLICATION_LIMIT,
    }),
    prisma.jobPosting.findMany({
      where: {
        userId,
      },
      include: {
        company: true,
      },
      orderBy: {
        savedAt: "desc",
      },
      take: RECENT_JOB_POSTING_LIMIT,
    }),
    prisma.jobPosting.findMany({
      where: {
        userId,
        matchScore: {
          not: null,
        },
      },
      include: {
        company: true,
      },
      orderBy: [
        {
          matchScore: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: SCORED_JOB_POSTING_LIMIT,
    }),
    keywordJobPostingsPromise,
    keywordResumesPromise,
  ]);

  if (!user) {
    throw new Error("Signed-in user was not found.");
  }

  const semanticJobPostings: Awaited<
    ReturnType<typeof searchJobPostingsBySemanticQuery>
  >["jobPostings"] = [];
  const semanticResumes: Awaited<
    ReturnType<typeof searchResumesBySemanticQuery>
  >["resumes"] = [];

  if (question.trim()) {
    const [jobPostingResult, resumeResult] = await Promise.allSettled([
      searchJobPostingsBySemanticQuery({
        userId,
        query: question,
        limit: SEMANTIC_RESULT_LIMIT,
      }),
      searchResumesBySemanticQuery({
        userId,
        query: question,
        limit: SEMANTIC_RESULT_LIMIT,
      }),
    ]);

    if (jobPostingResult.status === "fulfilled") {
      semanticJobPostings.push(...jobPostingResult.value.jobPostings);
    } else {
      limitations.push(
        "Semantic job posting retrieval was unavailable; keyword and dashboard context were still used.",
      );
    }

    if (resumeResult.status === "fulfilled") {
      semanticResumes.push(...resumeResult.value.resumes);
    } else {
      limitations.push(
        "Semantic resume retrieval was unavailable; keyword and dashboard context were still used.",
      );
    }
  }

  const missingProfileFields = [
    user.targetRole ? null : "target role",
    user.targetLocations ? null : "target locations",
    user.yearsOfExperience !== null ? null : "years of experience",
    user.currentRole ? null : "current role",
    user.preferredWorkMode ? null : "preferred work mode",
  ].filter(Boolean);
  const hasSavedRecords =
    counts.companies +
      counts.jobPostings +
      counts.resumes +
      counts.applications +
      counts.tasks +
      counts.interviews +
      counts.coverLetters >
    0;

  if (!hasSavedRecords) {
    limitations.push(
      "No saved job-search records were found, so the assistant can only discuss missing context.",
    );
  }

  const profileLines = [
    `- User name: ${formatValue(user.name)}`,
    `- Target role: ${formatValue(user.targetRole)}`,
    `- Current role: ${formatValue(user.currentRole)}`,
    `- Target locations: ${formatValue(user.targetLocations)}`,
    `- Years of experience: ${formatValue(user.yearsOfExperience)}`,
    `- Preferred work mode: ${formatStatus(user.preferredWorkMode)}`,
    `- Career context completeness: ${
      missingProfileFields.length === 0
        ? "complete"
        : `missing ${missingProfileFields.join(", ")}`
    }`,
  ];

  const countLines = [
    `- Companies: ${counts.companies}`,
    `- Job postings: ${counts.jobPostings}`,
    `- Resumes: ${counts.resumes}`,
    `- Applications: ${counts.applications}`,
    `- Tasks: ${counts.tasks}`,
    `- Interviews: ${counts.interviews}`,
    `- Cover letters: ${counts.coverLetters}`,
  ];

  const primaryResumeLines = user.primaryResume
    ? [
        formatResumeLine({
          index: 1,
          sourceKey: registry.addResumeSource(user.primaryResume),
          resume: user.primaryResume,
          terms,
        }),
      ]
    : [];

  const interviewLines = upcomingInterviews.map((interview, index) => {
    const interviewKey = registry.addInterviewSource(interview);
    const applicationKey = registry.addApplicationSource(interview.application);
    const jobPostingKey = registry.addJobPostingSource(
      interview.application.jobPosting,
    );
    const companyKey = registry.addCompanySource(
      interview.application.jobPosting.company,
    );

    return [
      `- ${index + 1}. Source ${interviewKey}: ${formatStatus(interview.type)} interview`,
      `scheduled: ${formatDateTime(interview.scheduledAt)}`,
      `duration minutes: ${formatValue(interview.durationMinutes)}`,
      `location/link: ${formatValue(interview.locationOrLink)}`,
      `interviewer: ${formatValue(interview.interviewerName)}`,
      `outcome: ${formatStatus(interview.outcome)}`,
      `application source: ${applicationKey}`,
      `job source: ${jobPostingKey}`,
      `company source: ${companyKey}`,
      `role: ${interview.application.jobPosting.title} at ${interview.application.jobPosting.company.name}`,
    ].join("; ");
  });

  const taskLines = pendingTasks.map((task, index) => {
    const taskKey = registry.addTaskSource(task);
    const isOverdue = task.dueAt ? task.dueAt < now : false;
    const linkedApplicationKey = task.application
      ? registry.addApplicationSource(task.application)
      : null;
    const linkedJobKey = task.application
      ? registry.addJobPostingSource(task.application.jobPosting)
      : null;
    const description = truncateText(task.description, NOTES_EXCERPT_LENGTH);

    return [
      `- ${index + 1}. Source ${taskKey}: ${task.title}`,
      `priority: ${formatStatus(task.priority)}`,
      `due: ${formatDate(task.dueAt)}`,
      `overdue: ${isOverdue ? "yes" : "no"}`,
      linkedApplicationKey ? `application source: ${linkedApplicationKey}` : null,
      linkedJobKey ? `job source: ${linkedJobKey}` : null,
      task.application
        ? `linked role: ${task.application.jobPosting.title} at ${task.application.jobPosting.company.name}`
        : "linked role: standalone task",
      description ? `description excerpt: ${description}` : null,
    ]
      .filter(Boolean)
      .join("; ");
  });

  const formatApplication = (
    application: (typeof recentApplications)[number],
    index: number,
  ) => {
    const applicationKey = registry.addApplicationSource(application);
    const jobPostingKey = registry.addJobPostingSource(application.jobPosting);
    const companyKey = registry.addCompanySource(application.jobPosting.company);
    const resumeKey = application.resume
      ? registry.addResumeSource(application.resume)
      : null;
    const notes = truncateText(application.notes, NOTES_EXCERPT_LENGTH);

    return [
      `- ${index + 1}. Source ${applicationKey}: ${application.jobPosting.title} at ${application.jobPosting.company.name}`,
      `status: ${formatStatus(application.status)}`,
      `priority: ${formatStatus(application.priority)}`,
      `applied: ${formatDate(application.appliedAt)}`,
      `next action: ${formatDate(application.nextActionDate)}`,
      `updated: ${formatDate(application.updatedAt)}`,
      `job source: ${jobPostingKey}`,
      `company source: ${companyKey}`,
      resumeKey ? `resume source: ${resumeKey}` : "resume: not linked",
      notes ? `notes excerpt: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("; ");
  };

  const attentionApplicationLines = applicationsNeedingAttention.map(
    formatApplication,
  );
  const recentApplicationLines = recentApplications.map(formatApplication);

  const recentJobPostingLines = recentJobPostings.map((jobPosting, index) =>
    formatJobPostingLine({
      index: index + 1,
      sourceKey: registry.addJobPostingSource(jobPosting),
      companyKey: registry.addCompanySource(jobPosting.company),
      jobPosting,
      terms,
    }),
  );

  const scoredJobPostingLines = scoredJobPostings.map((jobPosting, index) =>
    formatJobPostingLine({
      index: index + 1,
      sourceKey: registry.addJobPostingSource(jobPosting),
      companyKey: registry.addCompanySource(jobPosting.company),
      jobPosting,
      terms,
    }),
  );

  const keywordJobPostingLines = uniqueById(keywordJobPostings).map(
    (jobPosting, index) =>
      formatJobPostingLine({
        index: index + 1,
        sourceKey: registry.addJobPostingSource(jobPosting),
        companyKey: registry.addCompanySource(jobPosting.company),
        jobPosting,
        terms,
      }),
  );

  const keywordResumeLines = uniqueById(keywordResumes).map((resume, index) =>
    formatResumeLine({
      index: index + 1,
      sourceKey: registry.addResumeSource(resume),
      resume,
      terms,
    }),
  );

  const semanticJobPostingLines = uniqueById(semanticJobPostings).map(
    (jobPosting, index) =>
      formatJobPostingLine({
        index: index + 1,
        sourceKey: registry.addJobPostingSource(jobPosting),
        companyKey: registry.addCompanySource(jobPosting.company),
        jobPosting,
        terms,
        similarity: jobPosting.similarity,
      }),
  );

  const semanticResumeLines = uniqueById(semanticResumes).map((resume, index) =>
    formatResumeLine({
      index: index + 1,
      sourceKey: registry.addResumeSource(resume),
      resume,
      terms,
      similarity: resume.similarity,
    }),
  );

  const contextText = [
    "JobSeeker AI read-only dashboard assistant context.",
    "Use only the saved context below. Source keys identify records that may be cited.",
    `Current date: ${formatDate(now)}`,
    `Current timestamp: ${formatDateTime(now)}`,
    `Question-targeted keyword terms: ${
      terms.length > 0 ? terms.join(", ") : "none"
    }`,
    section("User Career Context", profileLines, "No user profile found."),
    section("Saved Record Counts", countLines, "No record counts available."),
    section(
      "Primary Resume",
      primaryResumeLines,
      "No primary resume is selected.",
    ),
    section(
      "Upcoming Interviews",
      interviewLines,
      "No upcoming interviews were found.",
    ),
    section(
      "Pending Or Overdue Tasks",
      taskLines,
      "No pending tasks were found.",
    ),
    section(
      "Applications Needing Attention",
      attentionApplicationLines,
      "No active applications with near-term next actions, high priority, screening, interviewing, or offer status were found.",
    ),
    section(
      "Recent Applications",
      recentApplicationLines,
      "No recent applications were found.",
    ),
    section(
      "Recent Job Postings",
      recentJobPostingLines,
      "No recent job postings were found.",
    ),
    section(
      "Saved Job Match Scores",
      scoredJobPostingLines,
      "No saved resume/job match scores were found.",
    ),
    section(
      "Question-Targeted Keyword Job Postings",
      keywordJobPostingLines,
      "No keyword-matched job postings were found for the extracted question terms.",
    ),
    section(
      "Question-Targeted Keyword Resumes",
      keywordResumeLines,
      "No keyword-matched resumes were found for the extracted question terms.",
    ),
    section(
      "Question-Targeted Semantic Job Postings",
      semanticJobPostingLines,
      "No semantic job posting results were available for this question.",
    ),
    section(
      "Question-Targeted Semantic Resumes",
      semanticResumeLines,
      "No semantic resume results were available for this question.",
    ),
  ].join("\n\n");

  return {
    contextText,
    sourceMap: registry.sourceMap,
    limitations,
    hasSavedRecords,
  };
}
