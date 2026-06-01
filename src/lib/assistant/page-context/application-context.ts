import {
  formatDate,
  formatDateTime,
  formatJobPostingLine,
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
  type ApplicationPageContextInput,
  type BuildAssistantPageContextInput,
} from "@/lib/assistant/page-context/shared";

const RELATED_TASK_QUERY_LIMIT = 12;
const RELATED_TASK_CONTEXT_LIMIT = 6;
const RELATED_INTERVIEW_QUERY_LIMIT = 10;
const RELATED_INTERVIEW_CONTEXT_LIMIT = 5;

function isStringLine(value: string | null): value is string {
  return Boolean(value);
}

function getTaskRank(
  task: {
    status: string;
    dueAt: Date | null;
  },
  now: Date,
) {
  if (task.status === "PENDING" && task.dueAt && task.dueAt < now) {
    return 0;
  }

  if (task.status === "PENDING") {
    return 1;
  }

  if (task.status === "DONE") {
    return 2;
  }

  return 3;
}

function compareOptionalDatesAscending(
  left: Date | null | undefined,
  right: Date | null | undefined,
) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.getTime() - right.getTime();
}

function getSortedApplicationTasks<T extends {
  status: string;
  dueAt: Date | null;
  updatedAt: Date;
}>(tasks: T[], now: Date) {
  return [...tasks].sort((left, right) => {
    const rankDifference = getTaskRank(left, now) - getTaskRank(right, now);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    const dueDateDifference = compareOptionalDatesAscending(
      left.dueAt,
      right.dueAt,
    );

    if (dueDateDifference !== 0) {
      return dueDateDifference;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

function getInterviewRank(
  interview: {
    scheduledAt: Date;
    outcome: string;
  },
  now: Date,
) {
  if (interview.scheduledAt >= now && interview.outcome === "PENDING") {
    return 0;
  }

  if (interview.scheduledAt >= now) {
    return 1;
  }

  return 2;
}

function getSortedApplicationInterviews<T extends {
  scheduledAt: Date;
  outcome: string;
}>(interviews: T[], now: Date) {
  return [...interviews].sort((left, right) => {
    const leftRank = getInterviewRank(left, now);
    const rightRank = getInterviewRank(right, now);
    const rankDifference = leftRank - rightRank;

    if (rankDifference !== 0) {
      return rankDifference;
    }

    if (leftRank <= 1) {
      return left.scheduledAt.getTime() - right.scheduledAt.getTime();
    }

    return right.scheduledAt.getTime() - left.scheduledAt.getTime();
  });
}

function formatCurrentApplicationLine({
  application,
  applicationKey,
}: {
  application: {
    status: string;
    priority: string;
    appliedAt: Date | null;
    nextActionDate: Date | null;
    rejectionReason: string | null;
    notes: string | null;
    updatedAt: Date;
    jobPosting: {
      title: string;
      company: {
        name: string;
      };
    };
  };
  applicationKey: string;
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
    `- Current application source ${applicationKey}: ${application.jobPosting.title} at ${application.jobPosting.company.name}`,
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

function formatRelatedTaskLine({
  task,
  taskKey,
  index,
  now,
}: {
  task: {
    title: string;
    status: string;
    priority: string;
    dueAt: Date | null;
    completedAt: Date | null;
    description: string | null;
    completionNotes: string | null;
    updatedAt: Date;
  };
  taskKey: string;
  index: number;
  now: Date;
}) {
  const description = truncateText(
    task.description,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );
  const completionNotes = truncateText(
    task.completionNotes,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );

  return [
    `- Related task ${index + 1}. Source ${taskKey}: ${task.title}`,
    `status: ${formatStatus(task.status)}`,
    `priority: ${formatStatus(task.priority)}`,
    `due: ${formatDate(task.dueAt)}`,
    `overdue: ${task.status === "PENDING" && task.dueAt && task.dueAt < now ? "yes" : "no"}`,
    `completed: ${formatDateTime(task.completedAt)}`,
    `updated: ${formatDateTime(task.updatedAt)}`,
    description ? `description excerpt: ${description}` : null,
    completionNotes ? `completion notes excerpt: ${completionNotes}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function formatRelatedInterviewLine({
  interview,
  interviewKey,
  index,
  now,
}: {
  interview: {
    type: string;
    scheduledAt: Date;
    durationMinutes: number | null;
    locationOrLink: string | null;
    interviewerName: string | null;
    outcome: string;
    prepNotes: string | null;
    feedback: string | null;
    updatedAt: Date;
  };
  interviewKey: string;
  index: number;
  now: Date;
}) {
  const prepNotes = truncateText(
    interview.prepNotes,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );
  const feedback = truncateText(
    interview.feedback,
    APPLICATION_NOTES_EXCERPT_LENGTH,
  );

  return [
    `- Related interview ${index + 1}. Source ${interviewKey}: ${formatStatus(interview.type)} interview`,
    `scheduled: ${formatDateTime(interview.scheduledAt)}`,
    `upcoming: ${interview.scheduledAt >= now ? "yes" : "no"}`,
    `duration minutes: ${formatValue(interview.durationMinutes)}`,
    `location/link: ${formatValue(interview.locationOrLink)}`,
    `interviewer: ${formatValue(interview.interviewerName)}`,
    `outcome: ${formatStatus(interview.outcome)}`,
    `updated: ${formatDateTime(interview.updatedAt)}`,
    prepNotes ? `prep notes excerpt: ${prepNotes}` : null,
    feedback ? `feedback excerpt: ${feedback}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export async function getCurrentApplicationContext({
  userId,
  registry,
  terms,
  now = new Date(),
  pageContext,
}: BuildAssistantPageContextInput & {
  pageContext: ApplicationPageContextInput;
}): Promise<ContextualAssistantContextModuleResult> {
  const application = await prisma.application.findFirst({
    where: {
      id: pageContext.id,
      userId,
    },
    include: {
      jobPosting: {
        include: {
          company: true,
          matchResume: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      resume: {
        select: {
          id: true,
          name: true,
        },
      },
      tasks: {
        where: {
          userId,
        },
        orderBy: [
          {
            dueAt: "asc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: RELATED_TASK_QUERY_LIMIT,
      },
      interviews: {
        where: {
          userId,
        },
        orderBy: [
          {
            scheduledAt: "asc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: RELATED_INTERVIEW_QUERY_LIMIT,
      },
    },
  });

  if (!application) {
    return buildUnavailableCurrentPageContext();
  }

  const applicationKey = registry.addApplicationSource(application);
  const jobPostingKey = registry.addJobPostingSource(application.jobPosting);
  const companyKey = registry.addCompanySource(application.jobPosting.company);
  const resumeKey = application.resume
    ? registry.addResumeSource(application.resume)
    : null;
  const matchResumeKey = application.jobPosting.matchResume
    ? registry.addResumeSource(application.jobPosting.matchResume)
    : null;
  const sortedTasks = getSortedApplicationTasks(application.tasks, now).slice(
    0,
    RELATED_TASK_CONTEXT_LIMIT,
  );
  const sortedInterviews = getSortedApplicationInterviews(
    application.interviews,
    now,
  ).slice(0, RELATED_INTERVIEW_CONTEXT_LIMIT);
  const taskLines =
    sortedTasks.length > 0
      ? sortedTasks.map((task, index) =>
          formatRelatedTaskLine({
            task,
            taskKey: registry.addTaskSource(task),
            index,
            now,
          }),
        )
      : ["- Related tasks: none saved for this application."];
  const interviewLines =
    sortedInterviews.length > 0
      ? sortedInterviews.map((interview, index) =>
          formatRelatedInterviewLine({
            interview,
            interviewKey: registry.addInterviewSource({
              ...interview,
              application,
            }),
            index,
            now,
          }),
        )
      : ["- Related interviews: none saved for this application."];
  const lines = [
    "- Current page type: application",
    `- Page-relative phrases like "this application", "this job application", "this opportunity", and "this process" refer to source ${applicationKey}.`,
    `- Linked job phrases like "this job", "this posting", and "this role" refer to source ${jobPostingKey}, when clearly referring to the linked job posting.`,
    `- Company source: ${companyKey}`,
    resumeKey ? `- Resume source: ${resumeKey}` : "- Resume source: not linked",
    application.jobPosting.matchAnalysis && matchResumeKey
      ? `- Saved job match analysis resume source: ${matchResumeKey}`
      : null,
    formatCurrentApplicationLine({
      application,
      applicationKey,
    }),
    formatJobPostingLine({
      index: 1,
      sourceKey: jobPostingKey,
      companyKey,
      jobPosting: application.jobPosting,
      terms,
    }),
    ...taskLines,
    ...interviewLines,
  ].filter(isStringLine);

  return {
    title: "Current Page Context",
    contextSection: section("Current Page Context", lines, ""),
    limitations: [],
    status: "ok",
  };
}
