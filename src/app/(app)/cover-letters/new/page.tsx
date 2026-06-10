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
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusMessage } from "@/components/ui/status-message";
import { Textarea } from "@/components/ui/textarea";

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
          <Card size="sm">
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription>
                Cover letters must be linked to an application. Create an
                application first, then return to write or generate a cover
                letter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full sm:w-auto" asChild>
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
                    <Select
                      id="manualApplicationId"
                      name="applicationId"
                      required
                    >
                      <option value="">Select an application</option>
                      {applications.map((application) => (
                        <option key={application.id} value={application.id}>
                          {application.jobPosting.title} —{" "}
                          {application.jobPosting.company.name}
                        </option>
                      ))}
                    </Select>
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
                      <Select
                        id="mode"
                        name="mode"
                        required
                        defaultValue="WRITTEN"
                      >
                        <option value="WRITTEN">
                          Written draft — recommended
                        </option>
                        <option value="UPLOADED">Uploaded document</option>
                      </Select>
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
                      <Checkbox
                        id="isFinal"
                        name="isFinal"
                      />
                      <Label htmlFor="isFinal">Mark as final version</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Cover letter text</Label>
                    <Textarea
                      id="content"
                      name="content"
                      className="min-h-72"
                      rows={12}
                      placeholder="Paste or write your cover letter draft here..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Tip: writing your own first draft usually gives better
                      personalization than starting from a fully generated
                      letter.
                    </p>
                  </div>

                  <FormActions
                    cancelHref="/cover-letters"
                    submitLabel="Create cover letter"
                  />
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
                  <Select
                    id="generationApplicationId"
                    name="applicationId"
                    required
                  >
                    <option value="">Select an application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobPosting.title} —{" "}
                        {application.jobPosting.company.name}
                      </option>
                    ))}
                  </Select>
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
