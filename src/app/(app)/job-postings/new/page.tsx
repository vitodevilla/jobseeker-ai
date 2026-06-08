import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJobPosting } from "@/app/(app)/job-postings/actions";
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

export default async function NewJobPostingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const companies = await prisma.company.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/job-postings"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to job postings
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            New job posting
          </h1>
          <p className="mt-2 text-muted-foreground">
            Save a role you are interested in and connect it to a company.
          </p>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Add a company first</CardTitle>
              <CardDescription>
                Job postings must be connected to a company. Create a company
                before saving job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/companies/new">Add company</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Job posting details</CardTitle>
              <CardDescription>
                Fields marked with * are required.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form action={createJobPosting} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company *</Label>
                  <select
                    id="companyId"
                    name="companyId"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Select a company</option>
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
                      placeholder="e.g. Junior Frontend Developer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g. Zagreb, Remote, Berlin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workMode">Work mode</Label>
                    <select
                      id="workMode"
                      name="workMode"
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Salary max</Label>
                    <Input
                      id="salaryMax"
                      name="salaryMax"
                      type="number"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryCurrency">
                      Salary currency
                    </Label>
                    <Input
                      id="salaryCurrency"
                      name="salaryCurrency"
                      placeholder="EUR"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">Posting URL</Label>
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      placeholder="https://example.com/job"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postedAt">Posted date</Label>
                    <Input id="postedAt" name="postedAt" type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" name="deadline" type="date" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={10}
                    placeholder="Paste the job description here..."
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Saved job text powers AI summary, resume match, tailoring
                    suggestions, and semantic search.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <Link href="/job-postings">Cancel</Link>
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    Create job posting
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
