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

export default async function CoverLettersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const coverLetters = await prisma.coverLetter.findMany({
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
    orderBy: [
      {
        applicationId: "asc",
      },
      {
        version: "desc",
      },
    ],
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cover letters</h1>
            <p className="mt-2 text-muted-foreground">
              Manage application-specific cover letter drafts, versions, and
              final sent letters.
            </p>
          </div>

          <Button asChild>
            <Link href="/cover-letters/new">New cover letter</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Writing guidance</CardTitle>
            <CardDescription>
              For best results, start with your own draft. JobSeeker AI can
              later help critique, tailor, or generate cover letters, but
              user-written drafts usually provide stronger personalization.
            </CardDescription>
          </CardHeader>
        </Card>

        {coverLetters.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No cover letters yet</CardTitle>
              <CardDescription>
                Create a cover letter for one of your applications. Written
                drafts are recommended; AI generation will come later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/cover-letters/new">Add cover letter</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {coverLetters.map((coverLetter) => (
              <Card key={coverLetter.id}>
                <CardHeader>
                  <CardTitle>{coverLetter.title}</CardTitle>
                  <CardDescription>
                    {coverLetter.application.jobPosting.title} —{" "}
                    {coverLetter.application.jobPosting.company.name}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Mode: {coverLetter.mode}</p>
                    <p>Version: {coverLetter.version}</p>
                    <p>{coverLetter.isFinal ? "Final version" : "Draft"}</p>
                  </div>

                  {coverLetter.content ? (
                    <p className="line-clamp-4 text-sm text-muted-foreground">
                      {coverLetter.content}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No text content added.
                    </p>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cover-letters/${coverLetter.id}/edit`}>
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
