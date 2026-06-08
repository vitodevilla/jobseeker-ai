import Link from "next/link";
import { BriefcaseIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge, StatusBadge } from "@/components/job-search-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/display-formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApplicationStatus, Prisma, Priority } from "@/generated/prisma";

const PAGE_SIZE = 10;
const APPLICATION_STATUSES: ApplicationStatus[] = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
  "ARCHIVED",
];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

type ApplicationsPageProps = {
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

  return `/applications?${params.toString()}`;
}

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
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

  const searchFilters: Prisma.ApplicationWhereInput[] = [];

  if (query) {
    const normalizedQuery = query.toUpperCase();
    const matchingStatuses = APPLICATION_STATUSES.filter((status) =>
      status.includes(normalizedQuery),
    );
    const matchingPriorities = PRIORITIES.filter((priority) =>
      priority.includes(normalizedQuery),
    );

    if (matchingStatuses.length > 0) {
      searchFilters.push({
        status: {
          in: matchingStatuses,
        },
      });
    }

    if (matchingPriorities.length > 0) {
      searchFilters.push({
        priority: {
          in: matchingPriorities,
        },
      });
    }

    searchFilters.push(
      {
        rejectionReason: {
          contains: query,
          mode: "insensitive" as const,
        },
      },
      {
        notes: {
          contains: query,
          mode: "insensitive" as const,
        },
      },
      {
        jobPosting: {
          title: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
      {
        jobPosting: {
          description: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
      {
        jobPosting: {
          location: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
      {
        jobPosting: {
          company: {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        },
      },
      {
        jobPosting: {
          company: {
            industry: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        },
      },
      {
        resume: {
          name: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
    );
  }

  const where: Prisma.ApplicationWhereInput = {
    userId: session.user.id,
    ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
  };

  const [applications, totalApplications] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        jobPosting: {
          include: {
            company: true,
          },
        },
        resume: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.application.count({
      where,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalApplications / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
            <p className="mt-2 text-muted-foreground">
              Track saved, submitted, interviewing, offered, and rejected
              applications in one place.
            </p>
          </div>

          <Button asChild>
            <Link href="/applications/new">New application</Link>
          </Button>
        </div>

        <Card size="sm">
          <CardHeader className="gap-1">
            <CardTitle>Search applications</CardTitle>
            <CardDescription>
              Search by job, company, status, priority, notes, rejection
              reason, or resume name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/applications"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search applications..."
              />
              <Button type="submit" className="w-full sm:w-auto">
                Search
              </Button>
              {query ? (
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/applications">Clear</Link>
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {applications.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <EmptyState
                icon={BriefcaseIcon}
                title={
                  query ? "No matching applications" : "No applications yet"
                }
                description={
                  query
                    ? "Try a different search term or clear the search."
                    : "Applications are created from saved job postings. Add one when you are ready to track a role."
                }
              >
                {query ? (
                  <Button variant="outline" asChild>
                    <Link href="/applications">Clear search</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild>
                      <Link href="/applications/new">Add application</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/job-postings/new">Add job posting</Link>
                    </Button>
                  </>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words">
                Showing {applications.length} of {totalApplications}{" "}
                {query ? "matching " : ""}
                applications
              </p>
              <p>
                Page {page} of {totalPages}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {applications.map((application) => (
                <Card key={application.id} size="sm" className="h-full">
                  <CardHeader className="gap-1">
                    <CardTitle>{application.jobPosting.title}</CardTitle>
                    <CardDescription>
                      {application.jobPosting.company.name}
                      {application.jobPosting.location
                        ? ` · ${application.jobPosting.location}`
                        : ""}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={application.status} />
                      <PriorityBadge priority={application.priority} />
                    </div>

                    <div className="grid gap-1.5 break-words text-sm text-muted-foreground">
                      {application.resume ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Resume:
                          </span>{" "}
                          {application.resume.name}
                        </p>
                      ) : (
                        <p>No resume selected</p>
                      )}

                      {application.appliedAt ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Applied:
                          </span>{" "}
                          {formatDisplayDate(application.appliedAt)}
                        </p>
                      ) : null}

                      {application.nextActionDate ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Next action:
                          </span>{" "}
                          {formatDisplayDate(application.nextActionDate)}
                        </p>
                      ) : null}
                    </div>

                    {application.notes ? (
                      <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                        {application.notes}
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href={`/applications/${application.id}/edit`}>
                        Open
                      </Link>
                    </Button>
                  </CardFooter>
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
    </>
  );
}
