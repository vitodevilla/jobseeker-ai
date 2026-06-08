import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardAssistantCard } from "@/app/(app)/dashboard/dashboard-assistant-card";
import { PriorityBadge, StatusBadge } from "@/components/job-search-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDisplayDate,
  formatDisplayDateTime,
} from "@/lib/display-formatters";
import type { ApplicationStatus } from "@/generated/prisma";

const ATTENTION_WINDOW_DAYS = 7;
const CLOSED_APPLICATION_STATUSES = [
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const satisfies readonly ApplicationStatus[];
const ACTIVE_ATTENTION_APPLICATION_STATUSES = [
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
] as const satisfies readonly ApplicationStatus[];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAttentionWindowEnd(now: Date) {
  const attentionWindowEnd = new Date(now);

  attentionWindowEnd.setDate(
    attentionWindowEnd.getDate() + ATTENTION_WINDOW_DAYS,
  );

  return attentionWindowEnd;
}

function getStartOfDay(date: Date) {
  const startOfDay = new Date(date);

  startOfDay.setHours(0, 0, 0, 0);

  return startOfDay;
}

function getCalendarDayDifference(date: Date, now: Date) {
  return Math.round(
    (getStartOfDay(date).getTime() - getStartOfDay(now).getTime()) / DAY_IN_MS,
  );
}

function getRelativeDateLabel(date: Date, now: Date) {
  const dayDifference = getCalendarDayDifference(date, now);

  if (dayDifference < -1) {
    return `${Math.abs(dayDifference)} days overdue`;
  }

  if (dayDifference === -1) {
    return "Yesterday";
  }

  if (dayDifference === 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Tomorrow";
  }

  if (dayDifference <= ATTENTION_WINDOW_DAYS) {
    return `In ${dayDifference} days`;
  }

  return formatDisplayDate(date);
}

function formatRelativeDate(date: Date | null, now: Date) {
  if (!date) {
    return "No date set";
  }

  const relativeLabel = getRelativeDateLabel(date, now);
  const displayDate = formatDisplayDate(date);

  return relativeLabel === displayDate
    ? displayDate
    : `${relativeLabel} - ${displayDate}`;
}

function formatRelativeDateTime(date: Date, now: Date) {
  const relativeLabel = getRelativeDateLabel(date, now);
  const displayDate = formatDisplayDate(date);
  const displayDateTime = formatDisplayDateTime(date);

  return relativeLabel === displayDate
    ? displayDateTime
    : `${relativeLabel} - ${displayDateTime}`;
}

function getUrgencyClassName(date: Date | null, now: Date) {
  if (!date) {
    return "text-muted-foreground";
  }

  const dayDifference = getCalendarDayDifference(date, now);

  if (dayDifference < 0) {
    return "font-medium text-destructive";
  }

  if (dayDifference <= 1) {
    return "font-medium text-foreground";
  }

  return "text-muted-foreground";
}

function compareNullableDates(left: Date | null, right: Date | null) {
  if (left && right) {
    return left.getTime() - right.getTime();
  }

  if (left) {
    return -1;
  }

  if (right) {
    return 1;
  }

  return 0;
}

function getPriorityRank(priority: string) {
  if (priority === "HIGH") {
    return 0;
  }

  if (priority === "MEDIUM") {
    return 1;
  }

  return 2;
}

function isActiveAttentionApplicationStatus(status: ApplicationStatus) {
  return (
    ACTIVE_ATTENTION_APPLICATION_STATUSES as readonly ApplicationStatus[]
  ).includes(status);
}

function getAttentionApplicationRank(application: {
  nextActionDate: Date | null;
  priority: string;
  status: ApplicationStatus;
}) {
  if (application.nextActionDate) {
    return 0;
  }

  if (application.priority === "HIGH") {
    return 1;
  }

  if (isActiveAttentionApplicationStatus(application.status)) {
    return 2;
  }

  return 3;
}

function getAttentionApplicationReason(
  application: {
    nextActionDate: Date | null;
    priority: string;
    status: ApplicationStatus;
  },
  now: Date,
) {
  if (application.nextActionDate) {
    return `Next action: ${formatRelativeDate(application.nextActionDate, now)}`;
  }

  if (application.priority === "HIGH") {
    return "High-priority application";
  }

  if (isActiveAttentionApplicationStatus(application.status)) {
    return `${formatStatus(application.status)} stage`;
  }

  return "Active application";
}

function EmptyDashboardPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const now = new Date();
  const attentionWindowEnd = getAttentionWindowEnd(now);

  const [
    user,
    upcomingInterviews,
    dueTasks,
    attentionApplications,
    recentApplications,
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
          email: true,
          targetRole: true,
          targetLocations: true,
          yearsOfExperience: true,
          currentRole: true,
          preferredWorkMode: true,
        },
      }),
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
        take: 3,
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
            dueAt: {
              sort: "asc",
              nulls: "last",
            },
          },
          {
            priority: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 3,
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
                lte: attentionWindowEnd,
              },
            },
            {
              priority: "HIGH",
            },
            {
              status: {
                in: [...ACTIVE_ATTENTION_APPLICATION_STATUSES],
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
            nextActionDate: {
              sort: "asc",
              nulls: "last",
            },
          },
          {
            priority: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: 6,
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
        take: 3,
      }),
    ]);

  if (!user) {
    redirect("/sign-in");
  }

  const missingProfileFields = [
    user.targetRole ? null : "target role",
    user.targetLocations ? null : "target locations",
    user.yearsOfExperience !== null ? null : "years of experience",
    user.currentRole ? null : "current role",
    user.preferredWorkMode ? null : "preferred work mode",
  ].filter(Boolean);
  const profileCompletedCount = 5 - missingProfileFields.length;
  const sortedAttentionApplications = [...attentionApplications].sort(
    (left, right) => {
      const rankDifference =
        getAttentionApplicationRank(left) - getAttentionApplicationRank(right);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      const dateDifference = compareNullableDates(
        left.nextActionDate,
        right.nextActionDate,
      );

      if (dateDifference !== 0) {
        return dateDifference;
      }

      const priorityDifference =
        getPriorityRank(left.priority) - getPriorityRank(right.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    },
  );
  const nextInterview = upcomingInterviews[0] ?? null;
  const mostUrgentTask = dueTasks[0] ?? null;
  const attentionApplication = sortedAttentionApplications[0] ?? null;

  return (
    <>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">
              Job search dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Start with the records that need action now: interviews to
              prepare, follow-ups to send, and applications to unblock.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/applications/new">Add application</Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/tasks/new">Add task</Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/interviews/new">Add interview</Link>
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Needs attention</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A compact starting point for what to do next.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="flex min-h-full flex-col justify-between gap-4 rounded-lg border border-border bg-muted/60 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Next interview
                </p>
                {nextInterview ? (
                  <>
                    <div className="space-y-1">
                      <p className="break-words text-sm font-medium">
                        {nextInterview.application.jobPosting.title}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {nextInterview.application.jobPosting.company.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {formatStatus(nextInterview.type)}
                      </Badge>
                      <StatusBadge status={nextInterview.outcome} />
                    </div>
                    <p
                      className={`text-sm ${getUrgencyClassName(
                        nextInterview.scheduledAt,
                        now,
                      )}`}
                    >
                      {formatRelativeDateTime(nextInterview.scheduledAt, now)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming interviews are scheduled.
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  href={
                    nextInterview
                      ? `/interviews/${nextInterview.id}/edit`
                      : "/interviews"
                  }
                >
                  {nextInterview ? "Open interview" : "View interviews"}
                </Link>
              </Button>
            </div>

            <div className="flex min-h-full flex-col justify-between gap-4 rounded-lg border border-border bg-muted/60 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Most urgent task
                </p>
                {mostUrgentTask ? (
                  <>
                    <div className="space-y-1">
                      <p className="break-words text-sm font-medium">
                        {mostUrgentTask.title}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {mostUrgentTask.application
                          ? `${mostUrgentTask.application.jobPosting.title} - ${mostUrgentTask.application.jobPosting.company.name}`
                          : "Standalone task"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={mostUrgentTask.status} />
                      <PriorityBadge priority={mostUrgentTask.priority} />
                    </div>
                    <p
                      className={`text-sm ${getUrgencyClassName(
                        mostUrgentTask.dueAt,
                        now,
                      )}`}
                    >
                      Due: {formatRelativeDate(mostUrgentTask.dueAt, now)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No pending tasks need action.
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  href={
                    mostUrgentTask ? `/tasks/${mostUrgentTask.id}/edit` : "/tasks"
                  }
                >
                  {mostUrgentTask ? "Open task" : "View tasks"}
                </Link>
              </Button>
            </div>

            <div className="flex min-h-full flex-col justify-between gap-4 rounded-lg border border-border bg-muted/60 p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Attention application
                </p>
                {attentionApplication ? (
                  <>
                    <div className="space-y-1">
                      <p className="break-words text-sm font-medium">
                        {attentionApplication.jobPosting.title}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {attentionApplication.jobPosting.company.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={attentionApplication.status} />
                      <PriorityBadge priority={attentionApplication.priority} />
                    </div>
                    <p
                      className={`text-sm ${getUrgencyClassName(
                        attentionApplication.nextActionDate,
                        now,
                      )}`}
                    >
                      {getAttentionApplicationReason(attentionApplication, now)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active applications are flagged for attention.
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  href={
                    attentionApplication
                      ? `/applications/${attentionApplication.id}/edit`
                      : "/applications"
                  }
                >
                  {attentionApplication ? "Open application" : "View applications"}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <DashboardAssistantCard />

        {missingProfileFields.length > 0 ? (
          <Card size="sm">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <p className="font-medium">
                    Career context {profileCompletedCount}/5 complete
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add the missing fields to improve AI matching, critique,
                    and recommendations.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingProfileFields.map((field) => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button className="w-full sm:w-auto" asChild>
                <Link href="/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming interviews</CardTitle>
              <CardDescription>
                The next scheduled interview rounds.
              </CardDescription>
              <CardAction>
                <Button variant="link" size="sm" asChild>
                  <Link href="/interviews">View all</Link>
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <EmptyDashboardPanel
                  title="No upcoming interviews"
                  description="When an interview is scheduled, it will appear here with the next preparation action."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/interviews">View interviews</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y rounded-lg border">
                  {upcomingInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="space-y-1">
                          <p className="break-words text-sm font-medium">
                            {interview.application.jobPosting.title}
                          </p>
                          <p className="break-words text-sm text-muted-foreground">
                            {interview.application.jobPosting.company.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {formatStatus(interview.type)}
                          </Badge>
                          <StatusBadge status={interview.outcome} />
                        </div>
                        <p
                          className={`text-sm ${getUrgencyClassName(
                            interview.scheduledAt,
                            now,
                          )}`}
                        >
                          {formatRelativeDateTime(interview.scheduledAt, now)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href={`/interviews/${interview.id}/edit`}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending tasks</CardTitle>
              <CardDescription>
                Follow-ups and reminders that still need action.
              </CardDescription>
              <CardAction>
                <Button variant="link" size="sm" asChild>
                  <Link href="/tasks">View all</Link>
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent>
              {dueTasks.length === 0 ? (
                <EmptyDashboardPanel
                  title="No pending tasks"
                  description="Add reminders for follow-ups, prep work, or application next steps."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/tasks/new">Add task</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y rounded-lg border">
                  {dueTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="space-y-1">
                          <p className="break-words text-sm font-medium">
                            {task.title}
                          </p>
                          <p className="break-words text-sm text-muted-foreground">
                            {task.application
                              ? `${task.application.jobPosting.title} - ${task.application.jobPosting.company.name}`
                              : "Standalone task"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={task.status} />
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <p
                          className={`text-sm ${getUrgencyClassName(
                            task.dueAt,
                            now,
                          )}`}
                        >
                          Due: {formatRelativeDate(task.dueAt, now)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href={`/tasks/${task.id}/edit`}>Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>
              Recently updated application records.
            </CardDescription>
            <CardAction>
              <Button variant="link" size="sm" asChild>
                <Link href="/applications">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent>
            {recentApplications.length === 0 ? (
              <EmptyDashboardPanel
                title="No applications yet"
                description="Applications are created from saved job postings. Add one when you are ready to track a role."
                action={
                  <Button size="sm" asChild>
                    <Link href="/applications/new">Add application</Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y rounded-lg border">
                {recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="space-y-1">
                        <p className="break-words text-sm font-medium">
                          {application.jobPosting.title}
                        </p>
                        <p className="break-words text-sm text-muted-foreground">
                          {application.jobPosting.company.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={application.status} />
                        <PriorityBadge priority={application.priority} />
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {application.nextActionDate ? (
                          <p
                            className={getUrgencyClassName(
                              application.nextActionDate,
                              now,
                            )}
                          >
                            Next action:{" "}
                            {formatRelativeDate(application.nextActionDate, now)}
                          </p>
                        ) : null}

                        {application.appliedAt ? (
                          <p>
                            Applied: {formatDisplayDate(application.appliedAt)}
                          </p>
                        ) : null}

                        <p className="break-words">
                          {application.resume
                            ? `Resume: ${application.resume.name}`
                            : "No resume selected"}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href={`/applications/${application.id}/edit`}>
                        Open
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
