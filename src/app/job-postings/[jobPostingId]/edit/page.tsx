import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  deleteJobPosting,
  generateJobPostingAiSummary,
  updateJobPosting,
} from "@/app/job-postings/actions";
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

type EditJobPostingPageProps = {
  params: Promise<{
    jobPostingId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
  }>;
};

function toDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditJobPostingPage({
  params,
  searchParams,
}: EditJobPostingPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { jobPostingId } = await params;
  const query = await searchParams;
  const error = query.error;

  const [jobPosting, companies] = await Promise.all([
    prisma.jobPosting.findFirst({
      where: {
        id: jobPostingId,
        userId: session.user.id,
      },
    }),
    prisma.company.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!jobPosting) {
    notFound();
  }

  const updateJobPostingWithId = updateJobPosting.bind(null, jobPosting.id);
  const deleteJobPostingWithId = deleteJobPosting.bind(null, jobPosting.id);
  const generateJobPostingAiSummaryWithId = generateJobPostingAiSummary.bind(
    null,
    jobPosting.id,
  );

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/job-postings"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to job postings
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Edit job posting
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update the saved role details and job description.
          </p>
        </div>

        {error === "missing-job-context" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>More job context is needed</CardTitle>
              <CardDescription>
                Add a job description or more saved role and company details
                before generating an AI summary.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "empty-ai-summary" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI summary was empty</CardTitle>
              <CardDescription>
                The AI request completed without a usable summary. Try
                generating the summary again.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "ai-summary-failed" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI summary could not be generated</CardTitle>
              <CardDescription>
                Something went wrong while generating the summary. Try again in
                a moment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {query.ai === "summary-generated" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            AI summary saved.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Job posting details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateJobPostingWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="companyId">Company *</Label>
                <select
                  id="companyId"
                  name="companyId"
                  required
                  defaultValue={jobPosting.companyId}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Job title *</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    defaultValue={jobPosting.title}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={jobPosting.location ?? ""}
                    placeholder="e.g. Zagreb, Remote, Berlin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workMode">Work mode</Label>
                  <select
                    id="workMode"
                    name="workMode"
                    defaultValue={jobPosting.workMode ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">No work mode</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seniorityLevel">Seniority</Label>
                  <Input
                    id="seniorityLevel"
                    name="seniorityLevel"
                    defaultValue={jobPosting.seniorityLevel ?? ""}
                    placeholder="e.g. Junior, Mid, Senior"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Salary min</Label>
                  <Input
                    id="salaryMin"
                    name="salaryMin"
                    type="number"
                    min="0"
                    defaultValue={jobPosting.salaryMin ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Salary max</Label>
                  <Input
                    id="salaryMax"
                    name="salaryMax"
                    type="number"
                    min="0"
                    defaultValue={jobPosting.salaryMax ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salaryCurrency">
                    Salary currency
                  </Label>
                  <Input
                    id="salaryCurrency"
                    name="salaryCurrency"
                    defaultValue={jobPosting.salaryCurrency ?? ""}
                    placeholder="EUR"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Posting URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    defaultValue={jobPosting.url ?? ""}
                    placeholder="https://example.com/job"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postedAt">Posted date</Label>
                  <Input
                    id="postedAt"
                    name="postedAt"
                    type="date"
                    defaultValue={toDateInputValue(jobPosting.postedAt)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    defaultValue={toDateInputValue(jobPosting.deadline)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={10}
                  defaultValue={jobPosting.description}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/job-postings">Cancel</Link>
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
                <CardTitle>AI summary</CardTitle>
                <CardDescription>
                  Saved summary for this job posting.
                  {jobPosting.aiSummaryAt
                    ? ` Generated ${jobPosting.aiSummaryAt.toLocaleString("hr-HR")}.`
                    : ""}
                </CardDescription>
              </div>

              <form action={generateJobPostingAiSummaryWithId}>
                <Button type="submit" variant="outline" size="sm">
                  {jobPosting.aiSummary ? "Refresh summary" : "AI summary"}
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            {jobPosting.aiSummary ? (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {jobPosting.aiSummary}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI summary has been generated for this job posting yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete job posting</CardTitle>
            <CardDescription>
              Remove this saved job posting. If an application exists for this
              posting, it may also be removed depending on the database
              relation.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteJobPostingWithId}
              title="Delete job posting?"
              description="This will remove this saved job posting. If an application exists for this posting, it may also be removed depending on the database relation. This action cannot be undone."
              confirmLabel="Delete job posting"
              triggerLabel="Delete job posting"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
