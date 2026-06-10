import Link from "next/link";
import { Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteCoverLetter,
  generateCoverLetterAiFeedback,
  updateCoverLetter,
} from "@/app/(app)/cover-letters/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { DangerZoneCard } from "@/components/danger-zone-card";
import { AiOutputPanel, AiSectionCard } from "@/components/ai-section-card";
import { EmptyState } from "@/components/empty-state";
import { MarkdownContent } from "@/components/markdown-content";
import { StatusMessage } from "@/components/ui/status-message";
import { formatDisplayDateTime } from "@/lib/display-formatters";

type EditCoverLetterPageProps = {
  params: Promise<{
    coverLetterId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
  }>;
};

function getModeDescription(mode: string) {
  if (mode === "GENERATED") {
    return "AI-generated first draft";
  }

  if (mode === "WRITTEN") {
    return "Written draft";
  }

  return "Uploaded document";
}

const coverLetterEditErrorMessages = {
  "missing-content": {
    title: "Cover letter content is required",
    description: "Add cover letter text before generating an AI critique.",
  },
  "empty-ai-feedback": {
    title: "AI critique was empty",
    description:
      "The AI request completed without usable feedback. Try generating the critique again.",
  },
  "ai-failed": {
    title: "AI critique could not be generated",
    description:
      "Something went wrong while generating feedback. Try again in a moment.",
  },
} as const;

function getCoverLetterEditErrorMessage(error?: string) {
  if (!error || !(error in coverLetterEditErrorMessages)) {
    return null;
  }

  return coverLetterEditErrorMessages[
    error as keyof typeof coverLetterEditErrorMessages
  ];
}

export default async function EditCoverLetterPage({
  params,
  searchParams,
}: EditCoverLetterPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { coverLetterId } = await params;
  const query = await searchParams;
  const error = query.error;
  const errorMessage = getCoverLetterEditErrorMessage(error);
  const aiSuccessMessage =
    query.ai === "generated"
      ? "AI critique saved."
      : query.ai === "draft-generated"
        ? "AI first draft created. Review and edit it before sending."
        : null;

  const [coverLetter, applications] = await Promise.all([
    prisma.coverLetter.findFirst({
      where: {
        id: coverLetterId,
        userId: session.user.id,
      },
    }),
    prisma.application.findMany({
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
    }),
  ]);

  if (!coverLetter) {
    notFound();
  }

  const updateCoverLetterWithId = updateCoverLetter.bind(null, coverLetter.id);
  const deleteCoverLetterWithId = deleteCoverLetter.bind(null, coverLetter.id);
  const generateCoverLetterAiFeedbackWithId = generateCoverLetterAiFeedback.bind(
    null,
    coverLetter.id,
  );

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
            Edit cover letter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update the draft, version, creation mode, and final status.
          </p>
        </div>

        {errorMessage ? (
          <StatusMessage
            variant="error"
            title={errorMessage.title}
            description={errorMessage.description}
          />
        ) : null}

        {aiSuccessMessage ? (
          <StatusMessage variant="success" title={aiSuccessMessage} />
        ) : null}

        <Card size="sm">
          <CardHeader>
            <CardTitle>Writing guidance</CardTitle>
            <CardDescription>
              Written drafts are the recommended starting point. AI critique can
              help you improve specificity, alignment, and readability.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover letter details</CardTitle>
            <CardDescription>
              Fields marked with * are required. Current mode:{" "}
              {getModeDescription(coverLetter.mode)}.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateCoverLetterWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="applicationId">Application *</Label>
                <Select
                  id="applicationId"
                  name="applicationId"
                  required
                  defaultValue={coverLetter.applicationId}
                >
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
                    defaultValue={coverLetter.title}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Creation mode *</Label>
                  <Select
                    id="mode"
                    name="mode"
                    required
                    defaultValue={coverLetter.mode}
                  >
                    <option value="WRITTEN">Written draft — recommended</option>
                    <option value="UPLOADED">
                      Uploaded document — upload later
                    </option>
                    {coverLetter.mode === "GENERATED" ? (
                      <option value="GENERATED">
                        AI-generated first draft
                      </option>
                    ) : null}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    name="version"
                    type="number"
                    min="1"
                    required
                    defaultValue={coverLetter.version}
                  />
                </div>

                <div className="flex items-center gap-2 sm:pt-7">
                  <Checkbox
                    id="isFinal"
                    name="isFinal"
                    defaultChecked={coverLetter.isFinal}
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
                  defaultValue={coverLetter.content ?? ""}
                  placeholder="Paste or write your cover letter draft here..."
                />
                <p className="text-sm text-muted-foreground">
                  Tip: writing your own first draft usually gives better
                  personalization than starting from a fully generated letter.
                </p>
              </div>

              <FormActions
                cancelHref="/cover-letters"
                submitLabel="Save changes"
              />
            </form>
          </CardContent>
        </Card>

        <AiSectionCard
          title="AI critique"
          description={
            <>
              Saved feedback for this cover letter version.
              {coverLetter.aiFeedbackAt
                ? ` Generated ${formatDisplayDateTime(coverLetter.aiFeedbackAt)}.`
                : ""}
            </>
          }
          action={
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
                {coverLetter.aiFeedback ? "Refresh critique" : "AI critique"}
              </Button>
            </form>
          }
        >
          {coverLetter.aiFeedback ? (
            <AiOutputPanel>
              <MarkdownContent>{coverLetter.aiFeedback}</MarkdownContent>
            </AiOutputPanel>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No AI critique yet"
              description="Generate feedback to review specificity, alignment, and readability before sending."
              className="py-4"
            />
          )}
        </AiSectionCard>

        <DangerZoneCard
          title="Delete cover letter"
          description="Remove this cover letter draft from your workspace. This action cannot be undone."
        >
          <DeleteConfirmationForm
            action={deleteCoverLetterWithId}
            title="Delete cover letter?"
            description="This will remove this cover letter draft from your workspace. This action cannot be undone."
            confirmLabel="Delete cover letter"
            triggerLabel="Delete cover letter"
          />
        </DangerZoneCard>
      </div>
    </>
  );
}
