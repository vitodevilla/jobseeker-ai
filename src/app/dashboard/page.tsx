import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/generated/prisma";

const activeApplicationStatuses: ApplicationStatus[] = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
];

const pipelineStatuses: ApplicationStatus[] = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
  "ARCHIVED",
];

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(date: Date) {
  return date.toLocaleString("hr-HR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("hr-HR", {
    dateStyle: "medium",
  });
}

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  href: string;
};

function StatCard({ title, value, description, href }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <p className="text-3xl font-bold">{value}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={href}>Open</Link>
        </Button>
      </CardContent>
    </Card>
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

  const [
    user,
    companyCount,
    resumeCount,
    jobPostingCount,
    applicationCount,
    activeApplicationCount,
    pendingTaskCount,
    upcomingInterviewCount,
    coverLetterCount,
    applicationsByStatus,
    upcomingInterviews,
    dueTasks,
    recentApplications,
  ] = await Promise.all([
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
    prisma.company.count({
      where: {
        userId,
      },
    }),
    prisma.resume.count({
      where: {
        userId,
      },
    }),
    prisma.jobPosting.count({
      where: {
        userId,
      },
    }),
    prisma.application.count({
      where: {
        userId,
      },
    }),
    prisma.application.count({
      where: {
        userId,
        status: {
          in: activeApplicationStatuses,
        },
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: "PENDING",
      },
    }),
    prisma.interview.count({
      where: {
        userId,
        scheduledAt: {
          gte: new Date(),
        },
      },
    }),
    prisma.coverLetter.count({
      where: {
        userId,
      },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: {
        userId,
      },
      _count: {
        status: true,
      },
    }),
    prisma.interview.findMany({
      where: {
        userId,
        scheduledAt: {
          gte: new Date(),
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
      take: 5,
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
      take: 5,
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
      take: 5,
    }),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const statusCounts = new Map<ApplicationStatus, number>();

  for (const item of applicationsByStatus) {
    statusCounts.set(item.status, item._count.status);
  }

  const missingProfileFields = [
    user.targetRole ? null : "target role",
    user.targetLocations ? null : "target locations",
    user.yearsOfExperience !== null ? null : "years of experience",
    user.currentRole ? null : "current role",
    user.preferredWorkMode ? null : "preferred work mode",
  ].filter(Boolean);

  return (
    <AppShell userName={user.name} userEmail={user.email}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Overview of your job-search workspace.
          </p>
        </div>

        {missingProfileFields.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Complete your career context</CardTitle>
              <CardDescription>
                Add {missingProfileFields.join(", ")} to improve future AI
                matching, critique, and recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/profile">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active applications"
            value={activeApplicationCount}
            description="Applications still in progress."
            href="/applications"
          />
          <StatCard
            title="Pending tasks"
            value={pendingTaskCount}
            description="Follow-ups and reminders to handle."
            href="/tasks"
          />
          <StatCard
            title="Upcoming interviews"
            value={upcomingInterviewCount}
            description="Scheduled interviews from now onward."
            href="/interviews"
          />
          <StatCard
            title="Saved job postings"
            value={jobPostingCount}
            description="Roles saved for tracking or applying."
            href="/job-postings"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Companies"
            value={companyCount}
            description="Companies in your workspace."
            href="/companies"
          />
          <StatCard
            title="Resumes"
            value={resumeCount}
            description="Resume versions available."
            href="/resumes"
          />
          <StatCard
            title="Cover letters"
            value={coverLetterCount}
            description="Drafts and final versions."
            href="/cover-letters"
          />
          <StatCard
            title="All applications"
            value={applicationCount}
            description="Total tracked applications."
            href="/applications"
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Application pipeline</CardTitle>
            <CardDescription>
              Current distribution of applications by status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pipelineStatuses.map((status) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {formatStatus(status)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {statusCounts.get(status) ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming interviews</CardTitle>
              <CardDescription>
                The next scheduled interview rounds.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming interviews.
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingInterviews.map((interview) => (
                    <div key={interview.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {formatStatus(interview.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {interview.application.jobPosting.title} —{" "}
                            {interview.application.jobPosting.company.name}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/interviews/${interview.id}/edit`}>
                            Open
                          </Link>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(interview.scheduledAt)}
                      </p>
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
            </CardHeader>

            <CardContent>
              {dueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending tasks.
                </p>
              ) : (
                <div className="space-y-4">
                  {dueTasks.map((task) => (
                    <div key={task.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.application
                              ? `${task.application.jobPosting.title} — ${task.application.jobPosting.company.name}`
                              : "Standalone task"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tasks/${task.id}/edit`}>Open</Link>
                        </Button>
                      </div>

                      {task.dueAt ? (
                        <p className="text-sm text-muted-foreground">
                          Due: {formatDate(task.dueAt)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No due date.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent applications</CardTitle>
              <CardDescription>
                Recently updated application records.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No applications yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentApplications.map((application) => (
                    <div key={application.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {application.jobPosting.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {application.jobPosting.company.name} ·{" "}
                            {formatStatus(application.status)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/applications/${application.id}/edit`}>
                            Open
                          </Link>
                        </Button>
                      </div>

                      {application.resume ? (
                        <p className="text-sm text-muted-foreground">
                          Resume: {application.resume.name}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
