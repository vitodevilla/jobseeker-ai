import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateResumeAiFeedback } from "@/app/resumes/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ResumesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const resumes = await prisma.resume.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
            <p className="mt-2 text-muted-foreground">
              Manage resume versions that you can later use for applications,
              matching, and AI feedback.
            </p>
          </div>

          <Button asChild>
            <Link href="/resumes/new">New resume</Link>
          </Button>
        </div>

        {resumes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No resumes yet</CardTitle>
              <CardDescription>
                Add your first resume version by pasting resume text or
                uploading a readable PDF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/resumes/new">Add resume</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resumes.map((resume) => {
              const generateResumeAiFeedbackWithId =
                generateResumeAiFeedback.bind(null, resume.id);

              return (
                <Card key={resume.id}>
                  <CardHeader>
                    <CardTitle>{resume.name}</CardTitle>
                    <CardDescription>
                      Updated {resume.updatedAt.toLocaleDateString("hr-HR")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="line-clamp-4 text-sm text-muted-foreground">
                      {resume.content}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/resumes/${resume.id}/edit`}>Edit</Link>
                      </Button>

                      <form action={generateResumeAiFeedbackWithId}>
                        <Button type="submit" variant="outline" size="sm">
                          {resume.aiFeedback
                            ? "Refresh critique"
                            : "AI critique"}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
