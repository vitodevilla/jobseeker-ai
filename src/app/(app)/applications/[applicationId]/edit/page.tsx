import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApplicationAssistantPageContext } from "@/lib/assistant/page-context-routing";
import { AssistantChatCard } from "@/components/assistant-chat-card";
import {
  deleteApplication,
  updateApplication,
} from "@/app/(app)/applications/actions";
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

type EditApplicationPageProps = {
  params: Promise<{
    applicationId: string;
  }>;
};

const applicationAssistantQuickPrompts = [
  "What is the current status and next step?",
  "What should I do next for this application?",
  "What tasks or interviews are tied to this application?",
  "Summarize this opportunity and any risks.",
];

function toDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditApplicationPage({
  params,
}: EditApplicationPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { applicationId } = await params;

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
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
  });

  if (!application) {
    notFound();
  }

  const [availableJobPostings, resumes] = await Promise.all([
    prisma.jobPosting.findMany({
      where: {
        userId: session.user.id,
        OR: [
          {
            application: null,
          },
          {
            id: application.jobPostingId,
          },
        ],
      },
      include: {
        company: true,
      },
      orderBy: {
        savedAt: "desc",
      },
    }),
    prisma.resume.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const updateApplicationWithId = updateApplication.bind(null, application.id);
  const deleteApplicationWithId = deleteApplication.bind(null, application.id);

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/applications"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to applications
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Edit application
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update status, priority, resume, dates, and notes for this
            application.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateApplicationWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="jobPostingId">Job posting *</Label>
                <select
                  id="jobPostingId"
                  name="jobPostingId"
                  required
                  defaultValue={application.jobPostingId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {availableJobPostings.map((jobPosting) => (
                    <option key={jobPosting.id} value={jobPosting.id}>
                      {jobPosting.title} — {jobPosting.company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <select
                    id="status"
                    name="status"
                    required
                    defaultValue={application.status}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="SAVED">Saved</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="APPLIED">Applied</option>
                    <option value="SCREENING">Screening</option>
                    <option value="INTERVIEWING">Interviewing</option>
                    <option value="OFFER">Offer</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                    <option value="GHOSTED">Ghosted</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    defaultValue={application.priority}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resumeId">Resume</Label>
                  <select
                    id="resumeId"
                    name="resumeId"
                    defaultValue={application.resumeId ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">No resume selected</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appliedAt">Applied date</Label>
                  <Input
                    id="appliedAt"
                    name="appliedAt"
                    type="date"
                    defaultValue={toDateInputValue(application.appliedAt)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextActionDate">Next action date</Label>
                  <Input
                    id="nextActionDate"
                    name="nextActionDate"
                    type="date"
                    defaultValue={toDateInputValue(application.nextActionDate)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection reason</Label>
                <Input
                  id="rejectionReason"
                  name="rejectionReason"
                  defaultValue={application.rejectionReason ?? ""}
                  placeholder="Only relevant if status is rejected"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Private notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  defaultValue={application.notes ?? ""}
                  placeholder="Anything important about this application..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/applications">Cancel</Link>
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <AssistantChatCard
          title="Ask about this application"
          description="The assistant can answer using this saved application and related saved records. It cannot see unsaved edits or change anything."
          quickPrompts={applicationAssistantQuickPrompts}
          pageContext={createApplicationAssistantPageContext(application.id)}
        />

        <DangerZoneCard
          title="Delete application"
          description="Remove this application record. Related cover letters, interviews, and tasks may also be removed depending on their database relations."
        >
          <DeleteConfirmationForm
            action={deleteApplicationWithId}
            title="Delete application?"
            description="This will remove this application record. Related cover letters, interviews, and tasks may also be removed depending on their database relations. This action cannot be undone."
            confirmLabel="Delete application"
            triggerLabel="Delete application"
          />
        </DangerZoneCard>
      </div>
    </>
  );
}
