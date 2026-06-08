import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCoverLetter,
  generateCoverLetterDraftForApplication,
} from "@/app/(app)/cover-letters/actions";
import { AiSectionCard } from "@/components/ai-section-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";

type NewCoverLetterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const coverLetterNewErrorMessages = {
  "missing-application": {
    title: "Application is required",
    description: "Select an application before generating a first draft.",
  },
  "ai-generation-failed": {
    title: "AI draft could not be generated",
    description:
      "Something went wrong while generating the first draft. Try again in a moment.",
  },
  "empty-ai-generation": {
    title: "AI draft was empty",
    description:
      "The AI request completed without usable cover letter text. Try generating the draft again.",
  },
} as const;

function getCoverLetterNewErrorMessage(error?: string) {
  if (!error || !(error in coverLetterNewErrorMessages)) {
    return null;
  }

  return coverLetterNewErrorMessages[
    error as keyof typeof coverLetterNewErrorMessages
  ];
}

export default async function NewCoverLetterPage({
  searchParams,
}: NewCoverLetterPageProps) {
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
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const query = await searchParams;
  const error = query.error;
  const errorMessage = getCoverLetterNewErrorMessage(error);

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/cover-letters"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to cover letters
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            New cover letter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create a cover letter draft for one of your applications. Writing
            your own draft first is still the recommended path.
          </p>
        </div>

        {errorMessage ? (
          <StatusMessage
            variant="error"
            title={errorMessage.title}
            description={errorMessage.description}
          />
        ) : null}

        {applications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription>
                Cover letters must be linked to an application. Create an
                application first, then return to write or generate a cover
                letter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/applications/new">Create application</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Write your cover letter</CardTitle>
                <CardDescription>
                  Recommended: start with your own draft, then use AI critique
                  later for specificity, alignment, and readability.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form action={createCoverLetter} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="manualApplicationId">Application *</Label>
                    <select
                      id="manualApplicationId"
                      name="applicationId"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="">Select an application</option>
                      {applications.map((application) => (
                        <option key={application.id} value={application.id}>
                          {application.jobPosting.title} —{" "}
                          {application.jobPosting.company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder="e.g. Infobip cover letter v1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mode">Creation mode *</Label>
                      <select
                        id="mode"
                        name="mode"
                        required
                        defaultValue="WRITTEN"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="WRITTEN">
                          Written draft — recommended
                        </option>
                        <option value="UPLOADED">Uploaded document</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="version">Version *</Label>
                      <Input
                        id="version"
                        name="version"
                        type="number"
                        min="1"
                        defaultValue="1"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:pt-7">
                      <input
                        id="isFinal"
                        name="isFinal"
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="isFinal">Mark as final version</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Cover letter text</Label>
                    <textarea
                      id="content"
                      name="content"
                      rows={12}
                      placeholder="Paste or write your cover letter draft here..."
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tip: writing your own first draft usually gives better
                      personalization than starting from a fully generated
                      letter.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button variant="outline" className="w-full sm:w-auto" asChild>
                      <Link href="/cover-letters">Cancel</Link>
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">
                      Create cover letter
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <AiSectionCard
              title="Generate a first draft with AI"
              description="Use this when you want a starting point from your application, job, company, profile, and linked resume context. You'll edit the draft before using it."
            >
              <form
                action={generateCoverLetterDraftForApplication}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="generationApplicationId">Application *</Label>
                  <select
                    id="generationApplicationId"
                    name="applicationId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Select an application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobPosting.title} —{" "}
                        {application.jobPosting.company.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">
                    This creates a separate generated draft and will not
                    overwrite anything you wrote.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="ai"
                  className="w-full sm:w-auto"
                >
                  Generate first draft
                </Button>
              </form>
            </AiSectionCard>
          </>
        )}
      </div>
    </>
  );
}
