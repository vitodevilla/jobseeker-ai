import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function JobPostingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const jobPostings = await prisma.jobPosting.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      company: true,
    },
    orderBy: {
      savedAt: "desc",
    },
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job postings</h1>
            <p className="mt-2 text-muted-foreground">
              Save interesting roles, connect them to companies, and prepare
              them for future matching and application tracking.
            </p>
          </div>

          <Button asChild>
            <Link href="/job-postings/new">New job posting</Link>
          </Button>
        </div>

        {jobPostings.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No job postings yet</CardTitle>
              <CardDescription>
                Save your first job posting after adding at least one company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/job-postings/new">Add job posting</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobPostings.map((jobPosting) => (
              <Card key={jobPosting.id}>
                <CardHeader>
                  <CardTitle>{jobPosting.title}</CardTitle>
                  <CardDescription>
                    {jobPosting.company.name}
                    {jobPosting.location ? ` · ${jobPosting.location}` : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {jobPosting.workMode ? (
                      <p>Work mode: {jobPosting.workMode}</p>
                    ) : null}
                    {jobPosting.seniorityLevel ? (
                      <p>Seniority: {jobPosting.seniorityLevel}</p>
                    ) : null}
                    {jobPosting.deadline ? (
                      <p>
                        Deadline:{" "}
                        {jobPosting.deadline.toLocaleDateString("hr-HR")}
                      </p>
                    ) : null}
                  </div>

                  <p className="line-clamp-4 text-sm text-muted-foreground">
                    {jobPosting.description}
                  </p>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/job-postings/${jobPosting.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
