import Link from "next/link";
import Form from "next/form";
import { BriefcaseIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJobPostingsBySemanticQuery } from "@/lib/retrieval/semantic-search";
import { generateJobPostingAiSummary } from "@/app/(app)/job-postings/actions";
import { EmptyState } from "@/components/empty-state";
import { MatchBadge, SimilarityBadge } from "@/components/job-search-badges";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/display-formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Prisma, WorkMode } from "@/generated/prisma";

const PAGE_SIZE = 10;
const SEMANTIC_RESULT_LIMIT = 5;
const SEARCH_MODES = ["keyword", "semantic"] as const;
const WORK_MODES = [
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "FLEXIBLE",
] as const satisfies readonly WorkMode[];
const WORK_MODE_LABELS = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
  FLEXIBLE: "Flexible",
} satisfies Record<WorkMode, string>;

type SearchMode = (typeof SEARCH_MODES)[number];

type JobPostingListItem = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  workMode: WorkMode | null;
  seniorityLevel: string | null;
  matchScore: number | null;
  deadline: Date | null;
  savedAt: Date;
  aiSummary: string | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
  };
  semanticSimilarity?: number;
};

type JobPostingFilters = {
  workMode?: WorkMode;
  companyId?: string;
};

type JobPostingsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    mode?: string | string[];
    workMode?: string | string[];
    companyId?: string | string[];
  }>;
};

function getSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getPageNumber(page?: string | string[]) {
  const value = getSearchParamValue(page);
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getSearchMode(mode?: string | string[]): SearchMode {
  const value = getSearchParamValue(mode);

  return SEARCH_MODES.includes(value as SearchMode)
    ? (value as SearchMode)
    : "keyword";
}

function getWorkMode(workMode?: string | string[]) {
  const value = getSearchParamValue(workMode);

  return WORK_MODES.includes(value as WorkMode) ? (value as WorkMode) : undefined;
}

function getCompanyId(
  companyId: string | string[] | undefined,
  companies: Array<{ id: string }>,
) {
  const value = getSearchParamValue(companyId);

  if (!value) {
    return undefined;
  }

  return companies.some((company) => company.id === value) ? value : undefined;
}

function buildPageHref(
  page: number,
  {
    query,
    searchMode,
    workMode,
    companyId,
  }: {
    query: string;
    searchMode: SearchMode;
    workMode?: WorkMode;
    companyId?: string;
  },
) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("mode", searchMode);

  if (workMode) {
    params.set("workMode", workMode);
  }

  if (companyId) {
    params.set("companyId", companyId);
  }

  params.set("page", page.toString());

  return `/job-postings?${params.toString()}`;
}

function buildKeywordJobPostingWhere(
  userId: string,
  query: string,
  filters: JobPostingFilters,
): Prisma.JobPostingWhereInput {
  return {
    userId,
    ...(filters.workMode ? { workMode: filters.workMode } : {}),
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
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
}

async function getKeywordJobPostingResults(
  userId: string,
  query: string,
  filters: JobPostingFilters,
  skip: number,
): Promise<{
  jobPostings: JobPostingListItem[];
  totalJobPostings: number;
}> {
  const where = buildKeywordJobPostingWhere(userId, query, filters);

  const [jobPostings, totalJobPostings] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        workMode: true,
        seniorityLevel: true,
        matchScore: true,
        deadline: true,
        savedAt: true,
        aiSummary: true,
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
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

  return {
    jobPostings,
    totalJobPostings,
  };
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
  const query = getSearchParamValue(params.q)?.trim() ?? "";
  const searchMode = getSearchMode(params.mode);
  const selectedWorkMode = getWorkMode(params.workMode);
  const page = getPageNumber(params.page);
  const skip = (page - 1) * PAGE_SIZE;

  const companies = await prisma.company.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const hasCompanies = companies.length > 0;
  const selectedCompanyId = getCompanyId(params.companyId, companies);
  const filters = {
    workMode: selectedWorkMode,
    companyId: selectedCompanyId,
  };
  const shouldRunSemanticSearch = searchMode === "semantic" && query.length > 0;
  let jobPostings: JobPostingListItem[] = [];
  let totalJobPostings = 0;
  let hasEmbeddedJobPostings = true;
  let semanticSearchUnavailable = false;

  if (shouldRunSemanticSearch) {
    try {
      const semanticResult = await searchJobPostingsBySemanticQuery({
        userId: session.user.id,
        query,
        limit: SEMANTIC_RESULT_LIMIT,
        offset: 0,
        filters,
      });

      jobPostings = semanticResult.jobPostings.map((jobPosting) => ({
        id: jobPosting.id,
        title: jobPosting.title,
        description: jobPosting.description,
        location: jobPosting.location,
        workMode: jobPosting.workMode,
        seniorityLevel: jobPosting.seniorityLevel,
        matchScore: jobPosting.matchScore,
        deadline: jobPosting.deadline,
        savedAt: jobPosting.savedAt,
        aiSummary: jobPosting.aiSummary,
        company: jobPosting.company,
        semanticSimilarity: jobPosting.similarity,
      }));
      totalJobPostings = semanticResult.totalCount;
      hasEmbeddedJobPostings = semanticResult.hasEmbeddedJobPostings;
    } catch {
      semanticSearchUnavailable = true;
      const keywordResult = await getKeywordJobPostingResults(
        session.user.id,
        query,
        filters,
        skip,
      );
      jobPostings = keywordResult.jobPostings;
      totalJobPostings = keywordResult.totalJobPostings;
    }
  } else {
    const keywordResult = await getKeywordJobPostingResults(
      session.user.id,
      query,
      filters,
      skip,
    );
    jobPostings = keywordResult.jobPostings;
    totalJobPostings = keywordResult.totalJobPostings;
  }

  const totalPages = Math.max(1, Math.ceil(totalJobPostings / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const hasListConstraints = Boolean(query || selectedWorkMode || selectedCompanyId);
  const hasActiveSearchControls = hasListConstraints || searchMode !== "keyword";
  const isShowingSemanticResults =
    shouldRunSemanticSearch && !semanticSearchUnavailable && hasEmbeddedJobPostings;
  const missingSemanticEmbeddings =
    shouldRunSemanticSearch && !semanticSearchUnavailable && !hasEmbeddedJobPostings;
  const emptyStateTitle = missingSemanticEmbeddings
    ? "No job postings ready for Semantic search"
    : isShowingSemanticResults
      ? "No Semantic search results"
      : hasListConstraints
        ? "No matching job postings"
        : hasCompanies
          ? "No job postings yet"
          : "Add a company first";
  const emptyStateDescription = missingSemanticEmbeddings
    ? "Semantic search results will appear after saved job postings are refreshed. Open a job posting and choose Refresh recommendations after editing."
    : isShowingSemanticResults
      ? "Try a different Semantic search phrase or adjust filters."
      : hasListConstraints
        ? "Try a different search term, adjust filters, or clear the search."
        : hasCompanies
          ? "Save your first job posting and connect it to a company."
          : "Job postings must be connected to a company. Add a company before saving your first job posting.";
  const resultSummary = isShowingSemanticResults
    ? "Showing the closest Semantic search results by semantic similarity over refreshed saved content. Scores are approximate."
    : `Showing ${jobPostings.length} of ${totalJobPostings} ${
        hasListConstraints ? "matching " : ""
      }job postings`;
  const shouldShowPagination = !isShowingSemanticResults;
  const paginationParams = {
    query,
    searchMode,
    workMode: selectedWorkMode,
    companyId: selectedCompanyId,
  };

  return (
    <>
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

        <Card size="sm">
          <CardHeader className="gap-1">
            <CardTitle>Search and filters</CardTitle>
            <CardDescription>
              Search saved jobs by title, company, location, seniority, or
              semantic similarity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form
              action="/job-postings"
              prefetch={false}
              className="space-y-3"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_220px]">
                <div className="space-y-1.5">
                  <Label htmlFor="q">Search</Label>
                  <Input
                    id="q"
                    name="q"
                    defaultValue={query}
                    placeholder="Title, skill, company, or meaning..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mode">Mode</Label>
                  <Select id="mode" name="mode" defaultValue={searchMode}>
                    <option value="keyword">Keyword</option>
                    <option value="semantic">Semantic search</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="workMode">Work mode</Label>
                  <Select
                    id="workMode"
                    name="workMode"
                    defaultValue={selectedWorkMode ?? ""}
                  >
                    <option value="">All work modes</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="companyId">Company</Label>
                  <Select
                    id="companyId"
                    name="companyId"
                    defaultValue={selectedCompanyId ?? ""}
                  >
                    <option value="">All companies</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {searchMode === "semantic"
                    ? "Uses semantic similarity over refreshed saved content."
                    : "Keyword mode searches saved fields and selected filters."}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <SubmitButton
                    pendingLabel="Searching..."
                    className="w-full sm:w-auto"
                  >
                    Search
                  </SubmitButton>
                  {hasActiveSearchControls ? (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href="/job-postings">Clear</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>

        {semanticSearchUnavailable ? (
          <Card
            size="sm"
            className="ring-[#C8D6E6] dark:ring-[#4F739F]/50"
          >
            <CardContent>
              <p className="text-sm text-[#334F70] dark:text-[#D6E2EF]">
                Semantic search is unavailable right now. Showing keyword
                results instead.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {jobPostings.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <EmptyState
                icon={BriefcaseIcon}
                title={emptyStateTitle}
                description={emptyStateDescription}
              >
                {hasListConstraints ? (
                  <Button variant="outline" asChild>
                    <Link href="/job-postings">Clear search</Link>
                  </Button>
                ) : !hasCompanies ? (
                  <Button asChild>
                    <Link href="/companies/new">Add company</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/job-postings/new">Add job posting</Link>
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 wrap-break-word">{resultSummary}</p>
              {shouldShowPagination ? (
                <p>
                  Page {page} of {totalPages}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {jobPostings.map((jobPosting) => {
                const generateJobPostingAiSummaryWithId =
                  generateJobPostingAiSummary.bind(null, jobPosting.id);

                return (
                  <Card key={jobPosting.id} size="sm" className="h-full">
                    <CardHeader className="gap-1">
                      <CardTitle>{jobPosting.title}</CardTitle>
                      <CardDescription>
                        {jobPosting.company.name}
                        {jobPosting.location
                          ? ` · ${jobPosting.location}`
                          : ""}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {jobPosting.semanticSimilarity !== undefined ? (
                          <SimilarityBadge
                            similarity={jobPosting.semanticSimilarity}
                          />
                        ) : null}
                        {jobPosting.workMode ? (
                          <Badge variant="outline">
                            {WORK_MODE_LABELS[jobPosting.workMode]}
                          </Badge>
                        ) : null}
                        {jobPosting.seniorityLevel ? (
                          <Badge variant="outline">
                            {jobPosting.seniorityLevel}
                          </Badge>
                        ) : null}
                        {jobPosting.matchScore !== null ? (
                          <MatchBadge score={jobPosting.matchScore} />
                        ) : null}
                      </div>

                      {jobPosting.deadline ? (
                        <p className="wrap-break-word text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Deadline:
                          </span>{" "}
                          {formatDisplayDate(jobPosting.deadline)}
                        </p>
                      ) : null}

                      <p className="line-clamp-3 wrap-break-word text-sm text-muted-foreground">
                        {jobPosting.description}
                      </p>
                    </CardContent>

                    <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href={`/job-postings/${jobPosting.id}/edit`}>
                          Open
                        </Link>
                      </Button>

                      <form
                        action={generateJobPostingAiSummaryWithId}
                        className="w-full sm:w-auto"
                      >
                        <SubmitButton
                          pendingLabel="Generating summary..."
                          variant="ai"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {jobPosting.aiSummary
                            ? "Refresh summary"
                            : "AI summary"}
                        </SubmitButton>
                      </form>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {shouldShowPagination ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" disabled={!hasPreviousPage} asChild>
                  {hasPreviousPage ? (
                    <Link href={buildPageHref(page - 1, paginationParams)}>
                      Previous
                    </Link>
                  ) : (
                    <span>Previous</span>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>

                <Button variant="outline" disabled={!hasNextPage} asChild>
                  {hasNextPage ? (
                    <Link href={buildPageHref(page + 1, paginationParams)}>
                      Next
                    </Link>
                  ) : (
                    <span>Next</span>
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
