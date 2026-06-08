import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchResumesBySemanticQuery } from "@/lib/retrieval/semantic-search";
import { generateResumeAiFeedback } from "@/app/(app)/resumes/actions";
import { EmptyState } from "@/components/empty-state";
import { SimilarityBadge } from "@/components/job-search-badges";
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
import type { Prisma } from "@/generated/prisma";

const PAGE_SIZE = 10;
const SEMANTIC_RESULT_LIMIT = 5;
const SEARCH_MODES = ["keyword", "semantic"] as const;

type SearchMode = (typeof SEARCH_MODES)[number];

type ResumeListItem = {
  id: string;
  name: string;
  content: string;
  fileUrl: string | null;
  aiFeedbackAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  semanticSimilarity?: number;
};

type ResumesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    mode?: string | string[];
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

function buildPageHref(
  page: number,
  {
    query,
    searchMode,
  }: {
    query: string;
    searchMode: SearchMode;
  },
) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("mode", searchMode);
  params.set("page", page.toString());

  return `/resumes?${params.toString()}`;
}

function buildKeywordResumeWhere(
  userId: string,
  query: string,
): Prisma.ResumeWhereInput {
  return {
    userId,
    ...(query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              content: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
}

async function getKeywordResumeResults(
  userId: string,
  query: string,
  skip: number,
): Promise<{
  resumes: ResumeListItem[];
  totalResumes: number;
}> {
  const where = buildKeywordResumeWhere(userId, query);

  const [resumes, totalResumes] = await Promise.all([
    prisma.resume.findMany({
      where,
      select: {
        id: true,
        name: true,
        content: true,
        fileUrl: true,
        aiFeedbackAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.resume.count({
      where,
    }),
  ]);

  return {
    resumes,
    totalResumes,
  };
}

export default async function ResumesPage({ searchParams }: ResumesPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const query = getSearchParamValue(params.q)?.trim() ?? "";
  const searchMode = getSearchMode(params.mode);
  const page = getPageNumber(params.page);
  const skip = (page - 1) * PAGE_SIZE;
  const shouldRunSemanticSearch = searchMode === "semantic" && query.length > 0;
  let resumes: ResumeListItem[] = [];
  let totalResumes = 0;
  let hasEmbeddedResumes = true;
  let semanticSearchUnavailable = false;

  if (shouldRunSemanticSearch) {
    try {
      const semanticResult = await searchResumesBySemanticQuery({
        userId: session.user.id,
        query,
        limit: SEMANTIC_RESULT_LIMIT,
        offset: 0,
      });

      resumes = semanticResult.resumes.map((resume) => ({
        id: resume.id,
        name: resume.name,
        content: resume.content,
        fileUrl: resume.fileUrl,
        aiFeedbackAt: resume.aiFeedbackAt,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
        semanticSimilarity: resume.similarity,
      }));
      totalResumes = semanticResult.totalCount;
      hasEmbeddedResumes = semanticResult.hasEmbeddedResumes;
    } catch {
      semanticSearchUnavailable = true;
      const keywordResult = await getKeywordResumeResults(
        session.user.id,
        query,
        skip,
      );
      resumes = keywordResult.resumes;
      totalResumes = keywordResult.totalResumes;
    }
  } else {
    const keywordResult = await getKeywordResumeResults(
      session.user.id,
      query,
      skip,
    );
    resumes = keywordResult.resumes;
    totalResumes = keywordResult.totalResumes;
  }

  const totalPages = Math.max(1, Math.ceil(totalResumes / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const hasListConstraints = Boolean(query);
  const hasActiveSearchControls = hasListConstraints || searchMode !== "keyword";
  const isShowingSemanticResults =
    shouldRunSemanticSearch && !semanticSearchUnavailable && hasEmbeddedResumes;
  const missingSemanticEmbeddings =
    shouldRunSemanticSearch && !semanticSearchUnavailable && !hasEmbeddedResumes;
  const emptyStateTitle = missingSemanticEmbeddings
    ? "No resumes ready for Semantic search"
    : isShowingSemanticResults
      ? "No Semantic search results"
      : hasListConstraints
        ? "No matching resumes"
        : "No resumes yet";
  const emptyStateDescription = missingSemanticEmbeddings
    ? "Semantic search results will appear after saved resumes are refreshed. Open a resume and choose Refresh recommendations after editing."
    : isShowingSemanticResults
      ? "Try a different Semantic search phrase."
      : hasListConstraints
        ? "Try a different search term or clear the search."
        : "Add your first resume version by pasting resume text or uploading a readable PDF.";
  const resultSummary = isShowingSemanticResults
    ? "Showing the closest Semantic search results by semantic similarity over refreshed saved content. Scores are approximate."
    : `Showing ${resumes.length} of ${totalResumes} ${
        hasListConstraints ? "matching " : ""
      }resumes`;
  const shouldShowPagination = !isShowingSemanticResults;
  const paginationParams = {
    query,
    searchMode,
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
            <p className="mt-2 text-muted-foreground">
              Manage resume versions that you can later use for applications,
              matching, and AI feedback.
            </p>
          </div>

          <Button asChild>
            <Link href="/resumes/new">New resume</Link>
          </Button>
        </div>

        <Card size="sm">
          <CardHeader className="gap-1">
            <CardTitle>Search resumes</CardTitle>
            <CardDescription>
              Search by resume title, skills, experience, or semantic
              similarity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/resumes" className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                <div className="space-y-1.5">
                  <Label htmlFor="q">Search</Label>
                  <Input
                    id="q"
                    name="q"
                    defaultValue={query}
                    placeholder="Title, skills, experience, or meaning..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mode">Mode</Label>
                  <Select id="mode" name="mode" defaultValue={searchMode}>
                    <option value="keyword">Keyword</option>
                    <option value="semantic">Semantic search</option>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {searchMode === "semantic"
                    ? "Uses semantic similarity over refreshed saved content."
                    : "Keyword mode searches saved resume titles and content."}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="submit" className="w-full sm:w-auto">
                    Search
                  </Button>
                  {hasActiveSearchControls ? (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href="/resumes">Clear</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </form>
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

        {resumes.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <EmptyState
                icon={FileTextIcon}
                title={emptyStateTitle}
                description={emptyStateDescription}
              >
                {hasListConstraints ? (
                  <Button variant="outline" asChild>
                    <Link href="/resumes">Clear search</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/resumes/new">Add resume</Link>
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words">{resultSummary}</p>
              {shouldShowPagination ? (
                <p>
                  Page {page} of {totalPages}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {resumes.map((resume) => {
                const generateResumeAiFeedbackWithId =
                  generateResumeAiFeedback.bind(null, resume.id);

                return (
                  <Card key={resume.id} size="sm" className="h-full">
                    <CardHeader className="gap-1">
                      <CardTitle>{resume.name}</CardTitle>
                      <CardDescription>
                        Updated {formatDisplayDate(resume.updatedAt)}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {resume.semanticSimilarity !== undefined ? (
                        <div className="flex flex-wrap gap-1.5">
                          <SimilarityBadge
                            similarity={resume.semanticSimilarity}
                          />
                        </div>
                      ) : null}

                      <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                        {resume.content}
                      </p>
                    </CardContent>

                    <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href={`/resumes/${resume.id}/edit`}>Open</Link>
                      </Button>

                      <form
                        action={generateResumeAiFeedbackWithId}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          type="submit"
                          variant="ai"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {resume.aiFeedbackAt
                            ? "Refresh critique"
                            : "AI critique"}
                        </Button>
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
