import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchResumesBySemanticQuery } from "@/lib/retrieval/semantic-search";
import { generateResumeAiFeedback } from "@/app/(app)/resumes/actions";
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
import type { Prisma } from "@/generated/prisma";

const PAGE_SIZE = 10;
const SEMANTIC_RESULT_LIMIT = 5;
const SEARCH_MODES = ["keyword", "semantic"] as const;
const SELECT_CLASS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

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

function formatSimilarityPercent(similarity: number) {
  const boundedSimilarity = Math.min(1, Math.max(0, similarity));
  return `${Math.round(boundedSimilarity * 100)}%`;
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
    ? "No resume semantic data"
    : isShowingSemanticResults
      ? "No semantic results"
      : hasListConstraints
        ? "No matching resumes"
        : "No resumes yet";
  const emptyStateDescription = missingSemanticEmbeddings
    ? "Semantic search results will appear after saved resumes have semantic data. Open a resume and choose Update semantic data after editing."
    : isShowingSemanticResults
      ? "Try a different semantic search phrase."
      : hasListConstraints
        ? "Try a different search term or clear the search."
        : "Add your first resume version by pasting resume text or uploading a readable PDF.";
  const resultSummary = isShowingSemanticResults
    ? "Showing the closest semantic results based on saved semantic data. Scores are approximate."
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

        <Card>
          <CardHeader>
            <CardTitle>Search resumes</CardTitle>
            <CardDescription>
              Search by resume title or content. Semantic search uses saved
              semantic data and approximate similarity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/resumes" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                <div className="space-y-2">
                  <Label htmlFor="q">Search</Label>
                  <Input
                    id="q"
                    name="q"
                    defaultValue={query}
                    placeholder="Search resumes by title, skills, experience, or meaning..."
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
                    <Link href="/resumes">Clear</Link>
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

        {resumes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{emptyStateTitle}</CardTitle>
              <CardDescription>{emptyStateDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {hasListConstraints ? (
                <Button variant="outline" asChild>
                  <Link href="/resumes">Clear search</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/resumes/new">Add resume</Link>
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
              {resumes.map((resume) => {
                const generateResumeAiFeedbackWithId =
                  generateResumeAiFeedback.bind(null, resume.id);

                return (
                  <Card key={resume.id}>
                    <CardHeader>
                      <CardTitle>{resume.name}</CardTitle>
                      <CardDescription>
                        Updated {resume.updatedAt.toLocaleDateString("hr-HR")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {resume.semanticSimilarity !== undefined ? (
                        <p className="text-sm text-muted-foreground">
                          Approx. similarity:{" "}
                          {formatSimilarityPercent(resume.semanticSimilarity)}
                        </p>
                      ) : null}

                      <p className="line-clamp-4 text-sm text-muted-foreground">
                        {resume.content}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/resumes/${resume.id}/edit`}>Edit</Link>
                        </Button>

                        <form action={generateResumeAiFeedbackWithId}>
                          <Button type="submit" variant="outline" size="sm">
                            {resume.aiFeedbackAt
                              ? "Refresh critique"
                              : "AI critique"}
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
