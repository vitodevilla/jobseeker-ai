import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  findSimilarJobPostingsToResume,
  getResumeSemanticSearchStatus,
  type ResumeSemanticSearchStatus,
  type SimilarJobPostingResult,
} from "@/lib/retrieval/semantic-search";
import { AppShell } from "@/components/app-shell";
import { AssistantChatCard } from "@/components/assistant-chat-card";
import {
  deleteResume,
  generateResumeAiFeedback,
  refreshResumeSemanticData,
  updateResume,
} from "@/app/resumes/actions";
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

type EditResumePageProps = {
  params: Promise<{
    resumeId: string;
  }>;
  searchParams: Promise<{
    ai?: string;
    error?: string;
    semantic?: string;
  }>;
};

const SIMILAR_RECORDS_LIMIT = 5;

const resumeAssistantQuickPrompts = [
  "What are the strongest signals in this resume?",
  "What gaps should I watch for against my target role?",
  "Which saved jobs seem most relevant to this resume?",
  "Where has this resume been used in my applications?",
];

type SimilarJobPostingsState =
  | {
      status: "available";
      semanticStatus: ResumeSemanticSearchStatus;
      jobPostings: SimilarJobPostingResult[];
    }
  | {
      status: "unavailable";
    };

function formatSimilarityPercent(similarity: number) {
  const boundedSimilarity = Math.min(1, Math.max(0, similarity));
  return `${Math.round(boundedSimilarity * 100)}%`;
}

function getSimilarSavedJobsEmptyMessage(status: ResumeSemanticSearchStatus) {
  if (!status.sourceResumeHasCurrentEmbedding) {
    return "Semantic results will appear after semantic data is refreshed.";
  }

  if (!status.jobPostingEmbeddingsExist) {
    return "Similar saved jobs will appear after your saved jobs have semantic data.";
  }

  return "No semantically similar saved jobs were found yet.";
}

async function getSimilarJobPostingsState(
  userId: string,
  resumeId: string,
): Promise<SimilarJobPostingsState> {
  try {
    const [semanticStatus, jobPostings] = await Promise.all([
      getResumeSemanticSearchStatus(userId, resumeId),
      findSimilarJobPostingsToResume(
        userId,
        resumeId,
        SIMILAR_RECORDS_LIMIT,
      ),
    ]);

    return {
      status: "available",
      semanticStatus,
      jobPostings,
    };
  } catch {
    return {
      status: "unavailable",
    };
  }
}

export default async function EditResumePage({
  params,
  searchParams,
}: EditResumePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { resumeId } = await params;
  const query = await searchParams;
  const error = query.error;

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId: session.user.id,
    },
  });

  if (!resume) {
    notFound();
  }

  const similarJobPostingsState = await getSimilarJobPostingsState(
    session.user.id,
    resume.id,
  );

  const updateResumeWithId = updateResume.bind(null, resume.id);
  const deleteResumeWithId = deleteResume.bind(null, resume.id);
  const generateResumeAiFeedbackWithId = generateResumeAiFeedback.bind(
    null,
    resume.id,
  );
  const refreshResumeSemanticDataWithId = refreshResumeSemanticData.bind(
    null,
    resume.id,
  );
  const resumeSemanticDataNeedsRefresh =
    similarJobPostingsState.status === "available" &&
    !similarJobPostingsState.semanticStatus.sourceResumeHasCurrentEmbedding;

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/resumes"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to resumes
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Edit resume
          </h1>
          <p className="mt-2 text-muted-foreground">
            Update this resume version by editing the text or replacing its PDF.
          </p>
        </div>

        {error === "missing-content" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Resume content is required</CardTitle>
              <CardDescription>
                Upload a readable PDF or keep resume text in the editor before
                saving changes.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "empty-ai-feedback" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI critique was empty</CardTitle>
              <CardDescription>
                The AI request completed without usable feedback. Try
                generating the critique again.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "ai-failed" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>AI critique could not be generated</CardTitle>
              <CardDescription>
                Something went wrong while generating feedback. Try again in a
                moment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "semantic-empty" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Semantic data needs content</CardTitle>
              <CardDescription>
                This record needs content before semantic data can be generated.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {error === "semantic-failed" ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle>Semantic data could not be updated</CardTitle>
              <CardDescription>
                Semantic data could not be updated right now.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {query.ai === "generated" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            AI critique saved.
          </p>
        ) : null}

        {query.semantic === "updated" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Semantic data updated.
          </p>
        ) : null}

        {query.semantic === "fresh" ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Semantic data was already up to date.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Resume details</CardTitle>
            <CardDescription>
              Resume name is required. Replace the stored PDF or edit the
              resume text manually.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateResumeWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Resume name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={resume.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfFile">Resume PDF</Label>
                <Input
                  id="pdfFile"
                  name="pdfFile"
                  type="file"
                  accept="application/pdf"
                />
                <p className="text-sm text-muted-foreground">
                  {resume.fileUrl
                    ? "A PDF is currently stored. Upload a new PDF to replace it. Maximum file size: 5 MB."
                    : "No PDF is currently stored. Upload a PDF to extract its text automatically. Maximum file size: 5 MB."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Resume content</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={14}
                  defaultValue={resume.content}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="text-sm text-muted-foreground">
                  If you upload a readable PDF, its extracted text will replace
                  this content. If no PDF is uploaded, this text will be saved.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/resumes">Cancel</Link>
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <AssistantChatCard
          title="Ask about this resume"
          description="The assistant can answer using this saved resume and related saved records. It cannot see unsaved edits or change anything."
          quickPrompts={resumeAssistantQuickPrompts}
          pageContext={{
            type: "resume",
            id: resume.id,
          }}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>AI critique</CardTitle>
                <CardDescription>
                  Saved feedback for this resume version.
                  {resume.aiFeedbackAt
                    ? ` Generated ${resume.aiFeedbackAt.toLocaleString("hr-HR")}.`
                    : ""}
                </CardDescription>
              </div>

              <form action={generateResumeAiFeedbackWithId}>
                <Button type="submit" variant="outline" size="sm">
                  {resume.aiFeedback ? "Refresh critique" : "AI critique"}
                </Button>
              </form>
            </div>
          </CardHeader>

          <CardContent>
            {resume.aiFeedback ? (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-6">
                {resume.aiFeedback}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI critique has been generated for this resume yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Similar saved jobs</CardTitle>
            <CardDescription>
              Semantically similar records based on saved semantic data. Scores
              are approximate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {similarJobPostingsState.status === "unavailable" ? (
              <p className="text-sm text-muted-foreground">
                Similar saved jobs are unavailable right now. The rest of this
                page is still available.
              </p>
            ) : resumeSemanticDataNeedsRefresh ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Semantic data needs refreshing after recent edits.
                </p>
                <form action={refreshResumeSemanticDataWithId}>
                  <Button type="submit" variant="outline" size="sm">
                    Update semantic data
                  </Button>
                </form>
              </div>
            ) : similarJobPostingsState.jobPostings.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {similarJobPostingsState.jobPostings.map((jobPosting) => (
                  <li key={jobPosting.id}>
                    <Link
                      href={`/job-postings/${jobPosting.id}/edit`}
                      className="group flex flex-col gap-2 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground underline-offset-4 group-hover:underline">
                          {jobPosting.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {jobPosting.companyName}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-muted-foreground">
                        Similarity:{" "}
                        {formatSimilarityPercent(jobPosting.similarity)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {getSimilarSavedJobsEmptyMessage(
                  similarJobPostingsState.semanticStatus,
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete resume</CardTitle>
            <CardDescription>
              Remove this resume version. Applications that referenced it will
              keep their history with the resume reference cleared.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteResumeWithId}
              title="Delete resume?"
              description="This will remove this resume version. Applications that referenced it will keep their history with the resume reference cleared. This action cannot be undone."
              confirmLabel="Delete resume"
              triggerLabel="Delete resume"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
