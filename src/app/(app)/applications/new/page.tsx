import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApplication } from "@/app/(app)/applications/actions";
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

export default async function NewApplicationPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const [availableJobPostings, resumes] = await Promise.all([
    prisma.jobPosting.findMany({
      where: {
        userId: session.user.id,
        application: null,
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
            New application
          </h1>
          <p className="mt-2 text-muted-foreground">
            Turn a saved job posting into a tracked application.
          </p>
        </div>

        {availableJobPostings.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No available job postings</CardTitle>
              <CardDescription>
                Add a job posting first, or all saved job postings already have
                applications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/job-postings/new">Add job posting</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Application details</CardTitle>
              <CardDescription>
                Fields marked with * are required.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form action={createApplication} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="jobPostingId">Job posting *</Label>
                  <select
                    id="jobPostingId"
                    name="jobPostingId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Select a job posting</option>
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
                      defaultValue="SAVED"
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
                      defaultValue="MEDIUM"
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
                      defaultValue=""
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
                    <Input id="appliedAt" name="appliedAt" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextActionDate">Next action date</Label>
                    <Input
                      id="nextActionDate"
                      name="nextActionDate"
                      type="date"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection reason</Label>
                  <Input
                    id="rejectionReason"
                    name="rejectionReason"
                    placeholder="Only relevant if status is rejected"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Private notes</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={5}
                    placeholder="Anything important about this application..."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <Link href="/applications">Cancel</Link>
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    Create application
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
