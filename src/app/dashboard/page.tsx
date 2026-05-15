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
    upcomingInterviews,
    dueTasks,
    recentApplications,
    recentJobPostings,
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
      take: 5,
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

  return (
    <AppShell userName={user.name} userEmail={user.email}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Focus on the interviews, follow-ups, and opportunities that need
            your attention now.
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

        <section className="grid gap-4 lg:grid-cols-2">
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
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {formatStatus(interview.type)}
                          </p>
                          <p className="wrap-break-word text-sm text-muted-foreground">
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
                        <div className="min-w-0">
                          <p className="wrap-break-word text-sm font-medium">
                            {task.title}
                          </p>
                          <p className="wrap-break-word text-sm text-muted-foreground">
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
                        <div className="min-w-0">
                          <p className="wrap-break-word text-sm font-medium">
                            {application.jobPosting.title}
                          </p>
                          <p className="wrap-break-word text-sm text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle>Recent job postings</CardTitle>
              <CardDescription>
                Recently saved roles to review or turn into applications.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {recentJobPostings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job postings yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentJobPostings.map((jobPosting) => (
                    <div key={jobPosting.id} className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="wrap-break-word text-sm font-medium">
                            {jobPosting.title}
                          </p>
                          <p className="wrap-break-word text-sm text-muted-foreground">
                            {jobPosting.company.name}
                            {jobPosting.location
                              ? ` · ${jobPosting.location}`
                              : ""}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/job-postings/${jobPosting.id}/edit`}>
                            Open
                          </Link>
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {jobPosting.deadline
                          ? `Deadline: ${formatDate(jobPosting.deadline)}`
                          : `Saved: ${formatDate(jobPosting.savedAt)}`}
                      </p>
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
