import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          <Card>
            <CardHeader>
              <CardTitle>No interviews yet</CardTitle>
              <CardDescription>
                Add an interview after you have at least one tracked
                application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/interviews/new">Add interview</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {interviews.map((interview) => (
              <Card key={interview.id}>
                <CardHeader>
                  <CardTitle>{interview.type.replaceAll("_", " ")}</CardTitle>
                  <CardDescription>
                    {interview.application.jobPosting.title} —{" "}
                    {interview.application.jobPosting.company.name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Scheduled:{" "}
                      {interview.scheduledAt.toLocaleString("hr-HR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p>Outcome: {interview.outcome}</p>

                    {interview.durationMinutes ? (
                      <p>Duration: {interview.durationMinutes} min</p>
                    ) : null}

                    {interview.locationOrLink ? (
                      <p>Location/link: {interview.locationOrLink}</p>
                    ) : null}

                    {interview.interviewerName ? (
                      <p>Interviewer: {interview.interviewerName}</p>
                    ) : null}
                  </div>

                  {interview.prepNotes ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {interview.prepNotes}
                    </p>
                  ) : null}

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/interviews/${interview.id}/edit`}>Edit</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
