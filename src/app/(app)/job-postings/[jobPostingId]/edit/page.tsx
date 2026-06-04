import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJobPostingAssistantPageContext } from "@/lib/assistant/page-context-routing";
import {
  findSimilarResumesToJobPosting,
  getJobPostingSemanticSearchStatus,
  type JobPostingSemanticSearchStatus,
  type SimilarResumeResult,
} from "@/lib/retrieval/semantic-search";
import { AssistantChatCard } from "@/components/assistant-chat-card";
import {
  analyzeResumeJobMatch,
  deleteJobPosting,
  generateJobPostingAiSummary,
  generateResumeTailoringSuggestions,
  refreshJobPostingSemanticData,
  updateJobPosting,
} from "@/app/(app)/job-postings/actions";
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
import { StatusMessage } from "@/components/ui/status-message";

type EditJobPostingPageProps = {
  params: Promise<{
    jobPostingId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
    semantic?: string;
  }>;
};

const SIMILAR_RECORDS_LIMIT = 5;

const jobPostingAssistantQuickPrompts = [
  "Does this job require Docker or containers?",
  "Which of my resumes fits this job best?",
  "What are the biggest risks for me in this role?",
  "How should I prepare for this role?",
];

type SimilarResumesState =
  | {
      status: "available";
      semanticStatus: JobPostingSemanticSearchStatus;
      resumes: SimilarResumeResult[];
    }
  | {
      status: "unavailable";
    };

function toDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatSimilarityPercent(similarity: number) {
  const boundedSimilarity = Math.min(1, Math.max(0, similarity));
  return `${Math.round(boundedSimilarity * 100)}%`;
}

function getSimilarResumesEmptyMessage(
  status: JobPostingSemanticSearchStatus,
) {
  if (!status.sourceJobPostingHasCurrentEmbedding) {
    return "Semantic results will appear after semantic data is refreshed.";
  }

  if (!status.resumeEmbeddingsExist) {
    return "Similar resumes will appear after your resumes have semantic data.";
  }

  return "No semantically similar resumes were found yet.";
}

async function getSimilarResumesState(
  userId: string,
  jobPostingId: string,
): Promise<SimilarResumesState> {
  try {
    const [semanticStatus, resumes] = await Promise.all([
      getJobPostingSemanticSearchStatus(userId, jobPostingId),
      findSimilarResumesToJobPosting(
        userId,
        jobPostingId,
        SIMILAR_RECORDS_LIMIT,
      ),
    ]);

    return {
      status: "available",
      semanticStatus,
      resumes,
    };
  } catch {
    return {
      status: "unavailable",
    };
  }
}

const jobPostingEditErrorMessages = {
  "missing-job-context": {
    title: "More job context is needed",
    description:
      "Add a job description or more saved role and company details before running AI analysis.",
  },
  "missing-resume": {
    title: "Select a resume",
    description:
      "Choose one of your saved resumes before running resume analysis.",
  },
  "missing-resume-content": {
    title: "Resume content is required",
    description:
      "The selected resume has no usable text. Edit the resume or upload a readable PDF before running resume analysis.",
  },
  "empty-ai-summary": {
    title: "AI summary was empty",
    description:
      "The AI request completed without a usable summary. Try generating the summary again.",
  },
  "ai-summary-failed": {
    title: "AI summary could not be generated",
    description:
      "Something went wrong while generating the summary. Try again in a moment.",
  },
  "empty-ai-match": {
    title: "AI match analysis was empty",
    description:
      "The AI request completed without usable match analysis. Try analyzing the match again.",
  },
  "invalid-ai-match": {
    title: "AI match analysis was invalid",
    description:
      "The AI response did not include a valid score and analysis. Try analyzing the match again.",
  },
  "ai-match-failed": {
    title: "AI match analysis could not be generated",
    description:
      "Something went wrong while analyzing the resume and job posting. Try again in a moment.",
  },
  "empty-ai-tailoring": {
    title: "AI tailoring suggestions were empty",
    description:
      "The AI request completed without usable tailoring suggestions. Try generating suggestions again.",
  },
  "ai-tailoring-failed": {
    title: "AI tailoring suggestions could not be generated",
    description:
      "Something went wrong while generating resume tailoring suggestions. Try again in a moment.",
  },
  "semantic-empty": {
    title: "Semantic data needs content",
    description:
      "This job posting needs saved content before semantic data can be generated.",
  },
  "semantic-failed": {
    title: "Semantic data could not be updated",
    description: "Semantic data could not be updated right now. Try again later.",
  },
} as const;

function getJobPostingEditErrorMessage(error?: string) {
  if (!error || !(error in jobPostingEditErrorMessages)) {
    return null;
  }

  return jobPostingEditErrorMessages[
    error as keyof typeof jobPostingEditErrorMessages
  ];
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
  const errorMessage = getJobPostingEditErrorMessage(error);
  const aiSuccessMessage =
    query.ai === "summary-generated"
      ? "AI summary saved."
      : query.ai === "match-generated"
        ? "Resume match analysis saved."
        : query.ai === "tailoring-generated"
          ? "Resume tailoring suggestions saved."
          : null;
  const semanticSuccessMessage =
    query.semantic === "updated"
      ? "Semantic data updated."
      : query.semantic === "fresh"
        ? "Semantic data was already up to date."
        : null;

  const [jobPosting, companies, resumes, user] = await Promise.all([
    prisma.jobPosting.findFirst({
      where: {
        id: jobPostingId,
        userId: session.user.id,
      },
      include: {
        matchResume: {
          select: {
            id: true,
            name: true,
          },
        },
        tailoringResume: {
          select: {
            id: true,
            name: true,
          },
        },
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
    prisma.resume.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        primaryResumeId: true,
      },
    }),
  ]);

  if (!jobPosting) {
    notFound();
  }

  if (!user) {
    redirect("/sign-in");
  }

  const similarResumesState = await getSimilarResumesState(
    session.user.id,
    jobPosting.id,
  );

  const updateJobPostingWithId = updateJobPosting.bind(null, jobPosting.id);
  const deleteJobPostingWithId = deleteJobPosting.bind(null, jobPosting.id);
  const generateJobPostingAiSummaryWithId = generateJobPostingAiSummary.bind(
    null,
    jobPosting.id,
  );
  const refreshJobPostingSemanticDataWithId =
    refreshJobPostingSemanticData.bind(null, jobPosting.id);
  const analyzeResumeJobMatchWithId = analyzeResumeJobMatch.bind(
    null,
    jobPosting.id,
  );
  const generateResumeTailoringSuggestionsWithId =
    generateResumeTailoringSuggestions.bind(null, jobPosting.id);
  const jobPostingSemanticDataNeedsRefresh =
    similarResumesState.status === "available" &&
    !similarResumesState.semanticStatus.sourceJobPostingHasCurrentEmbedding;
  const resumeIds = new Set(resumes.map((resume) => resume.id));
  const defaultResumeId =
    jobPosting.matchResumeId && resumeIds.has(jobPosting.matchResumeId)
      ? jobPosting.matchResumeId
      : user.primaryResumeId && resumeIds.has(user.primaryResumeId)
        ? user.primaryResumeId
        : "";
  const defaultTailoringResumeId =
    jobPosting.tailoringResumeId &&
    resumeIds.has(jobPosting.tailoringResumeId)
      ? jobPosting.tailoringResumeId
      : jobPosting.matchResumeId && resumeIds.has(jobPosting.matchResumeId)
        ? jobPosting.matchResumeId
        : user.primaryResumeId && resumeIds.has(user.primaryResumeId)
          ? user.primaryResumeId
          : "";

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
            Edit job posting
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update the saved role details and job description.
          </p>
        </div>

        {errorMessage ? (
          <StatusMessage
            variant="error"
            title={errorMessage.title}
            description={errorMessage.description}
          />
        ) : null}

        {aiSuccessMessage ? (
          <StatusMessage variant="success" title={aiSuccessMessage} />
        ) : null}

        {semanticSuccessMessage ? (
          <StatusMessage variant="success" title={semanticSuccessMessage} />
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

        <AssistantChatCard
          title="Ask about this saved job"
          description="The assistant can answer using this saved job posting and your other saved records. It cannot see unsaved edits or change anything."
          quickPrompts={jobPostingAssistantQuickPrompts}
          pageContext={createJobPostingAssistantPageContext(jobPosting.id)}
        />

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

        <Card>
          <CardHeader>
            <CardTitle>Resume match</CardTitle>
            <CardDescription>
              Analyze how well one saved resume matches this job posting.
              {jobPosting.matchScoreAt
                ? ` Generated ${jobPosting.matchScoreAt.toLocaleString("hr-HR")}.`
                : ""}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {resumes.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add a resume before analyzing match quality for this job
                  posting.
                </p>
                <Button asChild>
                  <Link href="/resumes/new">Add resume</Link>
                </Button>
              </div>
            ) : (
              <form action={analyzeResumeJobMatchWithId} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resumeId">Resume</Label>
                  <select
                    id="resumeId"
                    name="resumeId"
                    required
                    defaultValue={defaultResumeId}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Select a resume</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" variant="outline" size="sm">
                  {jobPosting.matchScore === null
                    ? "Analyze match"
                    : "Reanalyze match"}
                </Button>
                {jobPosting.matchScore !== null ? (
                  <p className="text-sm text-muted-foreground">
                    Reanalyzing regenerates the AI assessment and may slightly
                    change the score.
                  </p>
                ) : null}
              </form>
            )}

            {jobPosting.matchScore !== null ? (
              <div className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Match score: {jobPosting.matchScore}/100
                  </p>
                  {jobPosting.matchScoreAt ? (
                    <p>
                      Generated:{" "}
                      {jobPosting.matchScoreAt.toLocaleString("hr-HR")}
                    </p>
                  ) : null}
                  {jobPosting.matchResume ? (
                    <p>Resume: {jobPosting.matchResume.name}</p>
                  ) : null}
                </div>

                {jobPosting.matchAnalysis ? (
                  <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                    {jobPosting.matchAnalysis}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No saved match analysis text is available yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No resume match has been generated for this job posting yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume tailoring suggestions</CardTitle>
            <CardDescription>
              Get advice on what to change or emphasize for this saved job
              posting.
              {jobPosting.tailoringSuggestionsAt
                ? ` Generated ${jobPosting.tailoringSuggestionsAt.toLocaleString("hr-HR")}.`
                : ""}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {resumes.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add a resume before generating tailoring suggestions for this
                  job posting.
                </p>
                <Button asChild>
                  <Link href="/resumes/new">Add resume</Link>
                </Button>
              </div>
            ) : (
              <form
                action={generateResumeTailoringSuggestionsWithId}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="tailoringResumeId">Resume</Label>
                  <select
                    id="tailoringResumeId"
                    name="resumeId"
                    required
                    defaultValue={defaultTailoringResumeId}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Select a resume</option>
                    {resumes.map((resume) => (
                      <option key={resume.id} value={resume.id}>
                        {resume.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" variant="outline" size="sm">
                  {jobPosting.tailoringSuggestions
                    ? "Refresh tailoring suggestions"
                    : "Suggest resume tailoring"}
                </Button>
              </form>
            )}

            {jobPosting.tailoringSuggestions ? (
              <div className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  {jobPosting.tailoringSuggestionsAt ? (
                    <p>
                      Generated:{" "}
                      {jobPosting.tailoringSuggestionsAt.toLocaleString(
                        "hr-HR",
                      )}
                    </p>
                  ) : null}
                  {jobPosting.tailoringResume ? (
                    <p>Resume: {jobPosting.tailoringResume.name}</p>
                  ) : null}
                </div>

                <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                  {jobPosting.tailoringSuggestions}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No resume tailoring suggestions have been generated for this
                job posting yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Similar resumes</CardTitle>
            <CardDescription>
              Semantically similar records based on saved semantic data. Scores
              are approximate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {similarResumesState.status === "unavailable" ? (
              <p className="text-sm text-muted-foreground">
                Similar resumes are unavailable right now. The rest of this page
                is still available.
              </p>
            ) : jobPostingSemanticDataNeedsRefresh ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Semantic data needs refreshing after recent edits.
                </p>
                <form action={refreshJobPostingSemanticDataWithId}>
                  <Button type="submit" variant="outline" size="sm">
                    Update semantic data
                  </Button>
                </form>
              </div>
            ) : similarResumesState.resumes.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {similarResumesState.resumes.map((resume) => (
                  <li key={resume.id}>
                    <Link
                      href={`/resumes/${resume.id}/edit`}
                      className="group flex flex-col gap-2 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="min-w-0 font-medium text-foreground underline-offset-4 group-hover:underline">
                        {resume.name}
                      </p>
                      <p className="shrink-0 text-sm font-medium text-muted-foreground">
                        Similarity: {formatSimilarityPercent(resume.similarity)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {getSimilarResumesEmptyMessage(
                  similarResumesState.semanticStatus,
                )}
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
    </>
  );
}
