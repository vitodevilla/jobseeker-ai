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

export default async function ApplicationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const applications = await prisma.application.findMany({
    where: {
      userId: session.user.id,
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
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="mt-2 text-muted-foreground">
              Track saved, submitted, interviewing, offered, and rejected
              applications in one place.
            </p>
          </div>

          <Button asChild>
            <Link href="/applications/new">New application</Link>
          </Button>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription>
                Create an application from one of your saved job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/applications/new">Add application</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <CardTitle>{application.jobPosting.title}</CardTitle>
                  <CardDescription>
                    {application.jobPosting.company.name}
                    {application.jobPosting.location
                      ? ` · ${application.jobPosting.location}`
                      : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Status: {application.status}</p>
                    <p>Priority: {application.priority}</p>

                    {application.resume ? (
                      <p>Resume: {application.resume.name}</p>
                    ) : (
                      <p>No resume selected</p>
                    )}

                    {application.appliedAt ? (
                      <p>
                        Applied:{" "}
                        {application.appliedAt.toLocaleDateString("hr-HR")}
                      </p>
                    ) : null}

                    {application.nextActionDate ? (
                      <p>
                        Next action:{" "}
                        {application.nextActionDate.toLocaleDateString("hr-HR")}
                      </p>
                    ) : null}
                  </div>

                  {application.notes ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {application.notes}
                    </p>
                  ) : null}

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/applications/${application.id}/edit`}>
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
