import Link from "next/link";
import { MailIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCoverLetterAiFeedback } from "@/app/(app)/cover-letters/actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/display-formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatCoverLetterMode(mode: string) {
  if (mode === "GENERATED") {
    return "AI-generated first draft";
  }

  if (mode === "WRITTEN") {
    return "Written draft";
  }

  return "Uploaded document";
}

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
    <>
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
              critique your writing for improvement or generate a separate
              first draft when you need a starting point.
            </CardDescription>
          </CardHeader>
        </Card>

        {coverLetters.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={MailIcon}
                title="No cover letters yet"
                description="Create a cover letter for one of your applications. Written drafts are recommended, and AI can create a separate first draft if you need a starting point."
              >
                <Button asChild>
                  <Link href="/cover-letters/new">Add cover letter</Link>
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {coverLetters.map((coverLetter) => {
              const generateCoverLetterAiFeedbackWithId =
                generateCoverLetterAiFeedback.bind(null, coverLetter.id);

              return (
                <Card key={coverLetter.id}>
                  <CardHeader>
                    <CardTitle>{coverLetter.title}</CardTitle>
                    <CardDescription>
                      {coverLetter.application.jobPosting.title} —{" "}
                      {coverLetter.application.jobPosting.company.name}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {formatCoverLetterMode(coverLetter.mode)}
                      </Badge>
                      <Badge variant="outline">
                        {coverLetter.isFinal ? "Final version" : "Draft"}
                      </Badge>
                    </div>

                    <div className="space-y-1 break-words text-sm text-muted-foreground">
                      <p>Version: {coverLetter.version}</p>
                      <p>Updated: {formatDisplayDate(coverLetter.updatedAt)}</p>
                    </div>

                    {coverLetter.content ? (
                      <p className="line-clamp-4 break-words text-sm text-muted-foreground">
                        {coverLetter.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No text content added.
                      </p>
                    )}
                  </CardContent>

                  <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href={`/cover-letters/${coverLetter.id}/edit`}>
                        Edit
                      </Link>
                    </Button>

                    <form
                      action={generateCoverLetterAiFeedbackWithId}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        type="submit"
                        variant="ai"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        {coverLetter.aiFeedback
                          ? "Refresh critique"
                          : "AI critique"}
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
