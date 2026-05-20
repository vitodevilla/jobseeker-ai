import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  deleteCoverLetter,
  generateCoverLetterAiFeedback,
  updateCoverLetter,
} from "@/app/cover-letters/actions";
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
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";

type EditCoverLetterPageProps = {
  params: Promise<{
    coverLetterId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
  }>;
};

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
    <AppShell userName={session.user.name} userEmail={session.user.email}>
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

        <Card>
          <CardHeader>
            <CardTitle>Writing guidance</CardTitle>
            <CardDescription>
              Written drafts are the recommended starting point. AI critique can
              help you improve specificity, alignment, and readability.
            </CardDescription>
          </CardHeader>
        </Card>

        {error === "missing-content" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Cover letter content is required</CardTitle>
              <CardDescription>
                Add cover letter text before generating an AI critique.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "empty-ai-feedback" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI critique was empty</CardTitle>
              <CardDescription>
                The AI request completed without usable feedback. Try
                generating the critique again.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "ai-failed" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI critique could not be generated</CardTitle>
              <CardDescription>
                Something went wrong while generating feedback. Try again in a
                moment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {query.ai === "generated" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            AI critique saved.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Cover letter details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateCoverLetterWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="applicationId">Application *</Label>
                <select
                  id="applicationId"
                  name="applicationId"
                  required
                  defaultValue={coverLetter.applicationId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
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
                    defaultValue={coverLetter.title}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Creation mode *</Label>
                  <select
                    id="mode"
                    name="mode"
                    required
                    defaultValue={coverLetter.mode}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="WRITTEN">Written draft — recommended</option>
                    <option value="UPLOADED">
                      Uploaded document — upload later
                    </option>
                    <option value="GENERATED">
                      AI-generated draft — coming later
                    </option>
                  </select>
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

                <div className="flex items-center gap-2 pt-7">
                  <input
                    id="isFinal"
                    name="isFinal"
                    type="checkbox"
                    defaultChecked={coverLetter.isFinal}
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
                  defaultValue={coverLetter.content ?? ""}
                  placeholder="Paste or write your cover letter draft here..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="text-sm text-muted-foreground">
                  Tip: writing your own first draft usually gives better
                  personalization than starting from a fully generated letter.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/cover-letters">Cancel</Link>
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>AI critique</CardTitle>
                <CardDescription>
                  Saved feedback for this cover letter version.
                  {coverLetter.aiFeedbackAt
                    ? ` Generated ${coverLetter.aiFeedbackAt.toLocaleString("hr-HR")}.`
                    : ""}
                </CardDescription>
              </div>

              <form action={generateCoverLetterAiFeedbackWithId}>
                <Button type="submit" variant="outline" size="sm">
                  {coverLetter.aiFeedback ? "Refresh critique" : "AI critique"}
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            {coverLetter.aiFeedback ? (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {coverLetter.aiFeedback}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI critique has been generated for this cover letter yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete cover letter</CardTitle>
            <CardDescription>
              Remove this cover letter draft from your workspace. This action
              cannot be undone.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteCoverLetterWithId}
              title="Delete cover letter?"
              description="This will remove this cover letter draft from your workspace. This action cannot be undone."
              confirmLabel="Delete cover letter"
              triggerLabel="Delete cover letter"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
