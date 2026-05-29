import {
  formatDate,
  formatDateTime,
  formatJobPostingLine,
  formatResumeLine,
  formatStatus,
  formatValue,
  section,
  truncateText,
  uniqueById,
} from "@/lib/assistant/context-formatters";
import type { DashboardAssistantSourceRegistry } from "@/lib/assistant/source-registry";
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
const NOTES_EXCERPT_LENGTH = 300;

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

// These read-only modules are shaped so they can later become AI SDK tool execute bodies.
export type DashboardAssistantContextModuleResult = {
  title: string;
  contextSection: string;
  limitations: string[];
  status: "ok" | "empty" | "partial" | "error";
};

type Counts = {
  companies: number;
  jobPostings: number;
  resumes: number;
  applications: number;
  tasks: number;
  interviews: number;
  coverLetters: number;
};

export type SavedRecordCountsContextResult =
  DashboardAssistantContextModuleResult & {
    counts: Counts;
    hasSavedRecords: boolean;
  };

type DashboardModuleInput = {
  userId: string;
  registry: DashboardAssistantSourceRegistry;
  terms: string[];
};

type TimedDashboardModuleInput = DashboardModuleInput & {
  now: Date;
};

type SearchDashboardModuleInput = DashboardModuleInput & {
  question: string;
  mode: "keyword" | "semantic";
};

type ApplicationLineInput = {
  id: string;
  status: string;
  priority: string;
  appliedAt: Date | null;
  nextActionDate: Date | null;
  updatedAt: Date;
  notes: string | null;
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
  resume: {
    id: string;
    name: string;
  } | null;
};

function buildModuleResult({
  title,
  lines,
  emptyMessage,
  limitations = [],
  status,
}: {
  title: string;
  lines: string[];
  emptyMessage: string;
  limitations?: string[];
  status?: DashboardAssistantContextModuleResult["status"];
}): DashboardAssistantContextModuleResult {
  return {
    title,
    contextSection: section(title, lines, emptyMessage),
    limitations,
    status: status ?? (lines.length > 0 ? "ok" : "empty"),
  };
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

function getMissingProfileFields(user: {
  targetRole: string | null;
  targetLocations: string | null;
  yearsOfExperience: number | null;
  currentRole: string | null;
  preferredWorkMode: string | null;
}) {
  return [
    user.targetRole ? null : "target role",
    user.targetLocations ? null : "target locations",
    user.yearsOfExperience !== null ? null : "years of experience",
    user.currentRole ? null : "current role",
    user.preferredWorkMode ? null : "preferred work mode",
  ].filter((field): field is string => Boolean(field));
}

function formatApplicationLine({
  application,
  index,
  registry,
}: {
  application: ApplicationLineInput;
  index: number;
  registry: DashboardAssistantSourceRegistry;
}) {
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
}

export async function getUserCareerContext({
  userId,
}: {
  userId: string;
}): Promise<DashboardAssistantContextModuleResult> {
  const user = await prisma.user.findUnique({
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
    },
  });

  if (!user) {
    throw new Error("Signed-in user was not found.");
  }

  const missingProfileFields = getMissingProfileFields(user);
  const lines = [
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

  return buildModuleResult({
    title: "User Career Context",
    lines,
    emptyMessage: "No user profile found.",
  });
}

export async function getSavedRecordCounts({
  userId,
}: {
  userId: string;
}): Promise<SavedRecordCountsContextResult> {
  const counts = await Promise.all([
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
  );
  const hasSavedRecords =
    counts.companies +
      counts.jobPostings +
      counts.resumes +
      counts.applications +
      counts.tasks +
      counts.interviews +
      counts.coverLetters >
    0;
  const lines = [
    `- Companies: ${counts.companies}`,
    `- Job postings: ${counts.jobPostings}`,
    `- Resumes: ${counts.resumes}`,
    `- Applications: ${counts.applications}`,
    `- Tasks: ${counts.tasks}`,
    `- Interviews: ${counts.interviews}`,
    `- Cover letters: ${counts.coverLetters}`,
  ];

  return {
    ...buildModuleResult({
      title: "Saved Record Counts",
      lines,
      emptyMessage: "No record counts available.",
      status: hasSavedRecords ? "ok" : "empty",
    }),
    counts,
    hasSavedRecords,
  };
}

export async function getPrimaryResumeContext({
  userId,
  registry,
  terms,
}: DashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
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
  });

  if (!user) {
    throw new Error("Signed-in user was not found.");
  }

  const lines = user.primaryResume
    ? [
        formatResumeLine({
          index: 1,
          sourceKey: registry.addResumeSource(user.primaryResume),
          resume: user.primaryResume,
          terms,
        }),
      ]
    : [];

  return buildModuleResult({
    title: "Primary Resume",
    lines,
    emptyMessage: "No primary resume is selected.",
  });
}

export async function getUpcomingInterviewsContext({
  userId,
  registry,
  now,
}: TimedDashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const upcomingInterviews = await prisma.interview.findMany({
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
  });
  const lines = upcomingInterviews.map((interview, index) => {
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

  return buildModuleResult({
    title: "Upcoming Interviews",
    lines,
    emptyMessage: "No upcoming interviews were found.",
  });
}

export async function getPendingTasksContext({
  userId,
  registry,
  now,
}: TimedDashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const pendingTasks = await prisma.task.findMany({
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
  });
  const lines = pendingTasks.map((task, index) => {
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

  return buildModuleResult({
    title: "Pending Or Overdue Tasks",
    lines,
    emptyMessage: "No pending tasks were found.",
  });
}

export async function findApplicationsNeedingAttentionContext({
  userId,
  registry,
  now,
}: TimedDashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const applicationsNeedingAttention = await prisma.application.findMany({
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
  });
  const lines = applicationsNeedingAttention.map((application, index) =>
    formatApplicationLine({
      application,
      index,
      registry,
    }),
  );

  return buildModuleResult({
    title: "Applications Needing Attention",
    lines,
    emptyMessage:
      "No active applications with near-term next actions, high priority, screening, interviewing, or offer status were found.",
  });
}

export async function getRecentApplicationsContext({
  userId,
  registry,
}: DashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const recentApplications = await prisma.application.findMany({
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
  });
  const lines = recentApplications.map((application, index) =>
    formatApplicationLine({
      application,
      index,
      registry,
    }),
  );

  return buildModuleResult({
    title: "Recent Applications",
    lines,
    emptyMessage: "No recent applications were found.",
  });
}

export async function getRecentJobPostingsContext({
  userId,
  registry,
  terms,
}: DashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const recentJobPostings = await prisma.jobPosting.findMany({
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
  });
  const lines = recentJobPostings.map((jobPosting, index) =>
    formatJobPostingLine({
      index: index + 1,
      sourceKey: registry.addJobPostingSource(jobPosting),
      companyKey: registry.addCompanySource(jobPosting.company),
      jobPosting,
      terms,
    }),
  );

  return buildModuleResult({
    title: "Recent Job Postings",
    lines,
    emptyMessage: "No recent job postings were found.",
  });
}

export async function getSavedJobMatchScoresContext({
  userId,
  registry,
  terms,
}: DashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  const scoredJobPostings = await prisma.jobPosting.findMany({
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
  });
  const lines = scoredJobPostings.map((jobPosting, index) =>
    formatJobPostingLine({
      index: index + 1,
      sourceKey: registry.addJobPostingSource(jobPosting),
      companyKey: registry.addCompanySource(jobPosting.company),
      jobPosting,
      terms,
    }),
  );

  return buildModuleResult({
    title: "Saved Job Match Scores",
    lines,
    emptyMessage: "No saved resume/job match scores were found.",
  });
}

export async function searchJobPostingsContext({
  userId,
  registry,
  terms,
  question,
  mode,
}: SearchDashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  if (mode === "keyword") {
    const keywordJobPostings =
      terms.length > 0
        ? await prisma.jobPosting.findMany({
            where: buildJobPostingKeywordWhere(userId, terms),
            include: {
              company: true,
            },
            orderBy: {
              savedAt: "desc",
            },
            take: KEYWORD_RESULT_LIMIT,
          })
        : [];
    const lines = uniqueById(keywordJobPostings).map((jobPosting, index) =>
      formatJobPostingLine({
        index: index + 1,
        sourceKey: registry.addJobPostingSource(jobPosting),
        companyKey: registry.addCompanySource(jobPosting.company),
        jobPosting,
        terms,
      }),
    );

    return buildModuleResult({
      title: "Question-Targeted Keyword Job Postings",
      lines,
      emptyMessage:
        "No keyword-matched job postings were found for the extracted question terms.",
    });
  }

  const title = "Question-Targeted Semantic Job Postings";
  const emptyMessage =
    "No semantic job posting results were available for this question.";

  if (!question.trim()) {
    return buildModuleResult({
      title,
      lines: [],
      emptyMessage,
    });
  }

  try {
    const semanticResult = await searchJobPostingsBySemanticQuery({
      userId,
      query: question,
      limit: SEMANTIC_RESULT_LIMIT,
    });
    const lines = uniqueById(semanticResult.jobPostings).map(
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

    return buildModuleResult({
      title,
      lines,
      emptyMessage,
    });
  } catch {
    return buildModuleResult({
      title,
      lines: [],
      emptyMessage,
      status: "error",
      limitations: [
        "Semantic job posting retrieval was unavailable; keyword and dashboard context were still used.",
      ],
    });
  }
}

export async function searchResumesContext({
  userId,
  registry,
  terms,
  question,
  mode,
}: SearchDashboardModuleInput): Promise<DashboardAssistantContextModuleResult> {
  if (mode === "keyword") {
    const keywordResumes =
      terms.length > 0
        ? await prisma.resume.findMany({
            where: buildResumeKeywordWhere(userId, terms),
            orderBy: {
              updatedAt: "desc",
            },
            take: KEYWORD_RESULT_LIMIT,
          })
        : [];
    const lines = uniqueById(keywordResumes).map((resume, index) =>
      formatResumeLine({
        index: index + 1,
        sourceKey: registry.addResumeSource(resume),
        resume,
        terms,
      }),
    );

    return buildModuleResult({
      title: "Question-Targeted Keyword Resumes",
      lines,
      emptyMessage:
        "No keyword-matched resumes were found for the extracted question terms.",
    });
  }

  const title = "Question-Targeted Semantic Resumes";
  const emptyMessage =
    "No semantic resume results were available for this question.";

  if (!question.trim()) {
    return buildModuleResult({
      title,
      lines: [],
      emptyMessage,
    });
  }

  try {
    const semanticResult = await searchResumesBySemanticQuery({
      userId,
      query: question,
      limit: SEMANTIC_RESULT_LIMIT,
    });
    const lines = uniqueById(semanticResult.resumes).map((resume, index) =>
      formatResumeLine({
        index: index + 1,
        sourceKey: registry.addResumeSource(resume),
        resume,
        terms,
        similarity: resume.similarity,
      }),
    );

    return buildModuleResult({
      title,
      lines,
      emptyMessage,
    });
  } catch {
    return buildModuleResult({
      title,
      lines: [],
      emptyMessage,
      status: "error",
      limitations: [
        "Semantic resume retrieval was unavailable; keyword and dashboard context were still used.",
      ],
    });
  }
}
