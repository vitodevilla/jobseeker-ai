import Link from "next/link";
import { Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteInterview,
  generateInterviewPrepNotes,
  updateInterview,
} from "@/app/(app)/interviews/actions";
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
import { DangerZoneCard } from "@/components/danger-zone-card";
import { AiOutputPanel, AiSectionCard } from "@/components/ai-section-card";
import { EmptyState } from "@/components/empty-state";
import { MarkdownContent } from "@/components/markdown-content";
import { StatusMessage } from "@/components/ui/status-message";

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

const interviewEditErrorMessages = {
  "missing-application-context": {
    title: "Application context is missing",
    description:
      "This interview needs a saved application owned by your account before AI can generate prep notes.",
  },
  "missing-job-context": {
    title: "Job context is missing",
    description:
      "This interview needs a linked job posting and company before AI can generate prep notes.",
  },
  "ai-prep-failed": {
    title: "AI prep notes could not be generated",
    description:
      "Something went wrong while generating interview prep notes. Try again in a moment.",
  },
  "empty-ai-prep": {
    title: "AI prep notes were empty",
    description:
      "The AI request completed without usable prep notes. Try generating the notes again.",
  },
} as const;

function getInterviewEditErrorMessage(error?: string) {
  if (!error || !(error in interviewEditErrorMessages)) {
    return null;
  }

  return interviewEditErrorMessages[
    error as keyof typeof interviewEditErrorMessages
  ];
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
  const errorMessage = getInterviewEditErrorMessage(error);
  const aiSuccessMessage =
    query.ai === "prep-generated"
      ? "Interview prep notes saved. Review and edit them before the interview."
      : null;

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
    <>
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
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/interviews">Cancel</Link>
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <AiSectionCard
          title="AI interview prep"
          description="Creates saved prep notes using the last saved interview, application, job, company, resume, and career context. Refreshing replaces the saved prep notes. This creates saved notes, not a chat."
          action={
            <form
              action={generateInterviewPrepNotesWithId}
              className="w-full sm:w-auto"
            >
              <Button
                type="submit"
                variant="ai"
                size="sm"
                className="w-full sm:w-auto"
              >
                {interview.prepNotes
                  ? "Refresh prep notes"
                  : "Generate prep notes"}
              </Button>
            </form>
          }
        >
          {interview.prepNotes ? (
            <AiOutputPanel caption="AI-assisted notes. Review before using.">
              <MarkdownContent>{interview.prepNotes}</MarkdownContent>
            </AiOutputPanel>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No prep notes yet"
              description="Generate interview prep notes from the saved application and related context."
              className="py-4"
            />
          )}
        </AiSectionCard>

        <DangerZoneCard
          title="Delete interview"
          description="Remove this interview round from your workspace. This action cannot be undone."
        >
          <DeleteConfirmationForm
            action={deleteInterviewWithId}
            title="Delete interview?"
            description="This will remove this interview round from your workspace. This action cannot be undone."
            confirmLabel="Delete interview"
            triggerLabel="Delete interview"
          />
        </DangerZoneCard>
      </div>
    </>
  );
}
