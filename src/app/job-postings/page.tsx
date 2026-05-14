import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 10;

type JobPostingsPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function getPageNumber(page?: string) {
  const parsed = Number.parseInt(page ?? "1", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("page", page.toString());

  return `/job-postings?${params.toString()}`;
}

export default async function JobPostingsPage({
  searchParams,
}: JobPostingsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = getPageNumber(params.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    userId: session.user.id,
    ...(query
      ? {
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              location: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              seniorityLevel: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              salaryCurrency: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              url: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              company: {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              company: {
                industry: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [jobPostings, totalJobPostings] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: {
        company: true,
      },
      orderBy: {
        savedAt: "desc",
      },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.jobPosting.count({
      where,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalJobPostings / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job postings</h1>
            <p className="mt-2 text-muted-foreground">
              Save interesting roles, connect them to companies, and prepare
              them for future matching and application tracking.
            </p>
          </div>

          <Button asChild>
            <Link href="/job-postings/new">New job posting</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search job postings</CardTitle>
            <CardDescription>
              Search by title, description, company, industry, location,
              seniority, URL, or salary currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/job-postings"
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search job postings..."
              />
              <Button type="submit">Search</Button>
              {query ? (
                <Button variant="outline" asChild>
                  <Link href="/job-postings">Clear</Link>
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {jobPostings.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {query ? "No matching job postings" : "No job postings yet"}
              </CardTitle>
              <CardDescription>
                {query
                  ? "Try a different search term or clear the search."
                  : "Save your first job posting after adding at least one company."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {query ? (
                <Button variant="outline" asChild>
                  <Link href="/job-postings">Clear search</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/job-postings/new">Add job posting</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {jobPostings.length} of {totalJobPostings}{" "}
                {query ? "matching " : ""}
                job postings
              </p>
              <p>
                Page {page} of {totalPages}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {jobPostings.map((jobPosting) => (
                <Card key={jobPosting.id}>
                  <CardHeader>
                    <CardTitle>{jobPosting.title}</CardTitle>
                    <CardDescription>
                      {jobPosting.company.name}
                      {jobPosting.location ? ` · ${jobPosting.location}` : ""}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {jobPosting.workMode ? (
                        <p>Work mode: {jobPosting.workMode}</p>
                      ) : null}
                      {jobPosting.seniorityLevel ? (
                        <p>Seniority: {jobPosting.seniorityLevel}</p>
                      ) : null}
                      {jobPosting.deadline ? (
                        <p>
                          Deadline:{" "}
                          {jobPosting.deadline.toLocaleDateString("hr-HR")}
                        </p>
                      ) : null}
                    </div>

                    <p className="line-clamp-4 text-sm text-muted-foreground">
                      {jobPosting.description}
                    </p>

                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/job-postings/${jobPosting.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" disabled={!hasPreviousPage} asChild>
                {hasPreviousPage ? (
                  <Link href={buildPageHref(page - 1, query)}>Previous</Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>

              <Button variant="outline" disabled={!hasNextPage} asChild>
                {hasNextPage ? (
                  <Link href={buildPageHref(page + 1, query)}>Next</Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
