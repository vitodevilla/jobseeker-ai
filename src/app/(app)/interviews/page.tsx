import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/job-search-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayDateTime } from "@/lib/display-formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatInterviewType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function InterviewsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const interviews = await prisma.interview.findMany({
    where: {
      userId: session.user.id,
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
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Interviews</h1>
            <p className="mt-2 text-muted-foreground">
              Track upcoming and completed interview rounds for your
              applications.
            </p>
          </div>

          <Button asChild>
            <Link href="/interviews/new">New interview</Link>
          </Button>
        </div>

        {interviews.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <EmptyState
                icon={CalendarIcon}
                title="No interviews yet"
                description="Add an interview after you have at least one tracked application."
              >
                <Button asChild>
                  <Link href="/interviews/new">Add interview</Link>
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {interviews.map((interview) => (
              <Card key={interview.id} size="sm" className="h-full">
                <CardHeader className="gap-1">
                  <CardTitle>{interview.application.jobPosting.title}</CardTitle>
                  <CardDescription>
                    {interview.application.jobPosting.company.name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                      {formatInterviewType(interview.type)}
                    </Badge>
                    <StatusBadge status={interview.outcome} />
                  </div>

                  <div className="grid gap-1.5 wrap-break-word text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        Scheduled:
                      </span>{" "}
                      {formatDisplayDateTime(interview.scheduledAt)}
                    </p>

                    {interview.durationMinutes ? (
                      <p>
                        <span className="font-medium text-foreground">
                          Duration:
                        </span>{" "}
                        {interview.durationMinutes} min
                      </p>
                    ) : null}

                    {interview.locationOrLink ? (
                      <p className="break-all">
                        <span className="font-medium text-foreground">
                          Location/link:
                        </span>{" "}
                        {interview.locationOrLink}
                      </p>
                    ) : null}

                    {interview.interviewerName ? (
                      <p>
                        <span className="font-medium text-foreground">
                          Interviewer:
                        </span>{" "}
                        {interview.interviewerName}
                      </p>
                    ) : null}
                  </div>

                  {interview.prepNotes ? (
                    <p className="line-clamp-3 wrap-break-word text-sm text-muted-foreground">
                      {interview.prepNotes}
                    </p>
                  ) : null}
                </CardContent>

                <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    asChild
                  >
                    <Link href={`/interviews/${interview.id}/edit`}>Open</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
