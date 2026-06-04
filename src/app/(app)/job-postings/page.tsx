import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJobPostingsBySemanticQuery } from "@/lib/retrieval/semantic-search";
import { generateJobPostingAiSummary } from "@/app/(app)/job-postings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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
const SELECT_CLASS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

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

function formatSimilarityPercent(similarity: number) {
  const boundedSimilarity = Math.min(1, Math.max(0, similarity));
  return `${Math.round(boundedSimilarity * 100)}%`;
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
    ? "No job posting semantic data"
    : isShowingSemanticResults
      ? "No semantic results"
      : hasListConstraints
        ? "No matching job postings"
        : hasCompanies
          ? "No job postings yet"
          : "Add a company first";
  const emptyStateDescription = missingSemanticEmbeddings
    ? "Semantic search results will appear after saved job postings have semantic data. Open a job posting and choose Update semantic data after editing."
    : isShowingSemanticResults
      ? "Try a different semantic search phrase or adjust filters."
      : hasListConstraints
        ? "Try a different search term, adjust filters, or clear the search."
        : hasCompanies
          ? "Save your first job posting and connect it to a company."
          : "Job postings must be connected to a company. Add a company before saving your first job posting.";
  const resultSummary = isShowingSemanticResults
    ? "Showing the closest semantic results based on saved semantic data. Scores are approximate."
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

        <Card>
          <CardHeader>
            <CardTitle>Search job postings</CardTitle>
            <CardDescription>
              Search by title, description, company, industry, location,
              seniority, URL, or salary currency. Semantic search uses saved
              semantic data and approximate similarity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/job-postings" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_220px]">
                <div className="space-y-2">
                  <Label htmlFor="q">Search</Label>
                  <Input
                    id="q"
                    name="q"
                    defaultValue={query}
                    placeholder="Search saved jobs by title, skill, company, or meaning..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Mode</Label>
                  <select
                    id="mode"
                    name="mode"
                    defaultValue={searchMode}
                    className={SELECT_CLASS}
                  >
                    <option value="keyword">Keyword</option>
                    <option value="semantic">Semantic</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workMode">Work mode</Label>
                  <select
                    id="workMode"
                    name="workMode"
                    defaultValue={selectedWorkMode ?? ""}
                    className={SELECT_CLASS}
                  >
                    <option value="">All work modes</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyId">Company</Label>
                  <select
                    id="companyId"
                    name="companyId"
                    defaultValue={selectedCompanyId ?? ""}
                    className={SELECT_CLASS}
                  >
                    <option value="">All companies</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {searchMode === "semantic" ? (
                <p className="text-sm text-muted-foreground">
                  Semantic search uses saved semantic data and approximate
                  similarity.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Search</Button>
                {hasActiveSearchControls ? (
                  <Button variant="outline" asChild>
                    <Link href="/job-postings">Clear</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        {semanticSearchUnavailable ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Semantic search is unavailable right now. Showing keyword
                results instead.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {jobPostings.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{emptyStateTitle}</CardTitle>
              <CardDescription>{emptyStateDescription}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>{resultSummary}</p>
              {shouldShowPagination ? (
                <p>
                  Page {page} of {totalPages}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {jobPostings.map((jobPosting) => {
                const generateJobPostingAiSummaryWithId =
                  generateJobPostingAiSummary.bind(null, jobPosting.id);

                return (
                  <Card key={jobPosting.id}>
                    <CardHeader>
                      <CardTitle>{jobPosting.title}</CardTitle>
                      <CardDescription>
                        {jobPosting.company.name}
                        {jobPosting.location
                          ? ` · ${jobPosting.location}`
                          : ""}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {jobPosting.semanticSimilarity !== undefined ? (
                          <p>
                            Approx. similarity:{" "}
                            {formatSimilarityPercent(
                              jobPosting.semanticSimilarity,
                            )}
                          </p>
                        ) : null}
                        {jobPosting.workMode ? (
                          <p>Work mode: {jobPosting.workMode}</p>
                        ) : null}
                        {jobPosting.seniorityLevel ? (
                          <p>Seniority: {jobPosting.seniorityLevel}</p>
                        ) : null}
                        {jobPosting.matchScore !== null ? (
                          <p>Match: {jobPosting.matchScore}/100</p>
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

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/job-postings/${jobPosting.id}/edit`}>
                            Edit
                          </Link>
                        </Button>

                        <form action={generateJobPostingAiSummaryWithId}>
                          <Button type="submit" variant="outline" size="sm">
                            {jobPosting.aiSummary
                              ? "Refresh summary"
                              : "AI summary"}
                          </Button>
                        </form>
                      </div>
                    </CardContent>
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
