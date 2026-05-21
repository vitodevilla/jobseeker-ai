import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  deleteInterview,
  generateInterviewPrepNotes,
  updateInterview,
} from "@/app/interviews/actions";
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

type EditInterviewPageProps = {
  params: Promise<{
    interviewId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
  }>;
};

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

export default async function EditInterviewPage({
  params,
  searchParams,
}: EditInterviewPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { interviewId } = await params;
  const query = await searchParams;
  const error = query.error;

  const [interview, applications] = await Promise.all([
    prisma.interview.findFirst({
      where: {
        id: interviewId,
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

  if (!interview) {
    notFound();
  }

  const updateInterviewWithId = updateInterview.bind(null, interview.id);
  const deleteInterviewWithId = deleteInterview.bind(null, interview.id);
  const generateInterviewPrepNotesWithId = generateInterviewPrepNotes.bind(
    null,
    interview.id,
  );

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/interviews"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to interviews
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Edit interview
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update interview scheduling, preparation, outcome, and feedback.
          </p>
        </div>

        {error === "missing-application-context" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Application context is missing</CardTitle>
              <CardDescription>
                This interview needs a saved application owned by your account
                before AI can generate prep notes.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "missing-job-context" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Job context is missing</CardTitle>
              <CardDescription>
                This interview needs a linked job posting and company before AI
                can generate prep notes.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "ai-prep-failed" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI prep notes could not be generated</CardTitle>
              <CardDescription>
                Something went wrong while generating interview prep notes. Try
                again in a moment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "empty-ai-prep" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI prep notes were empty</CardTitle>
              <CardDescription>
                The AI request completed without usable prep notes. Try
                generating the notes again.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {query.ai === "prep-generated" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Interview prep notes saved. Review and edit them before the
            interview.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Interview details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateInterviewWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="applicationId">Application *</Label>
                <select
                  id="applicationId"
                  name="applicationId"
                  required
                  defaultValue={interview.applicationId}
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
                  <Label htmlFor="type">Interview type *</Label>
                  <select
                    id="type"
                    name="type"
                    required
                    defaultValue={interview.type}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="PHONE_SCREEN">Phone screen</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BEHAVIORAL">Behavioral</option>
                    <option value="SYSTEM_DESIGN">System design</option>
                    <option value="CASE_STUDY">Case study</option>
                    <option value="IN_PERSON">In person</option>
                    <option value="FINAL">Final</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Scheduled at *</Label>
                  <Input
                    id="scheduledAt"
                    name="scheduledAt"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeLocalValue(interview.scheduledAt)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration minutes</Label>
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="0"
                    defaultValue={interview.durationMinutes ?? ""}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">Outcome *</Label>
                  <select
                    id="outcome"
                    name="outcome"
                    required
                    defaultValue={interview.outcome}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No show</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationOrLink">Location or link</Label>
                  <Input
                    id="locationOrLink"
                    name="locationOrLink"
                    defaultValue={interview.locationOrLink ?? ""}
                    placeholder="Office address or meeting link"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewerName">Interviewer name</Label>
                  <Input
                    id="interviewerName"
                    name="interviewerName"
                    defaultValue={interview.interviewerName ?? ""}
                    placeholder="e.g. Ana Horvat"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewerEmail">Interviewer email</Label>
                  <Input
                    id="interviewerEmail"
                    name="interviewerEmail"
                    type="email"
                    defaultValue={interview.interviewerEmail ?? ""}
                    placeholder="ana@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepNotes">Prep notes / personal edits</Label>
                <textarea
                  id="prepNotes"
                  name="prepNotes"
                  rows={5}
                  defaultValue={interview.prepNotes ?? ""}
                  placeholder="Add personal reminders or edit generated prep notes..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="text-sm text-muted-foreground">
                  You can edit generated prep notes here or add your own
                  reminders. The AI interview prep card below is the readable
                  saved-notes view.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <textarea
                  id="feedback"
                  name="feedback"
                  rows={5}
                  defaultValue={interview.feedback ?? ""}
                  placeholder="Reflection or feedback after the interview..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/interviews">Cancel</Link>
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
                <CardTitle>AI interview prep</CardTitle>
                <CardDescription>
                  Creates saved prep notes using the last saved interview,
                  application, job, company, resume, and career context.
                  Refreshing replaces the saved prep notes. This creates saved
                  notes, not a chat.
                </CardDescription>
              </div>

              <form action={generateInterviewPrepNotesWithId}>
                <Button type="submit" variant="outline" size="sm">
                  {interview.prepNotes
                    ? "Refresh prep notes"
                    : "Generate prep notes"}
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            {interview.prepNotes ? (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {interview.prepNotes}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI prep notes have been generated for this interview yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete interview</CardTitle>
            <CardDescription>
              Remove this interview round from your workspace. This action
              cannot be undone.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteInterviewWithId}
              title="Delete interview?"
              description="This will remove this interview round from your workspace. This action cannot be undone."
              confirmLabel="Delete interview"
              triggerLabel="Delete interview"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
