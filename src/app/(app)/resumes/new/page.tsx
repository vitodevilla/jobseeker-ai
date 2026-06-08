import Link from "next/link";
import { createResume } from "@/app/(app)/resumes/actions";
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
import { StatusMessage } from "@/components/ui/status-message";
import { Textarea } from "@/components/ui/textarea";

type NewResumePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const resumeFormErrorMessages = {
  "missing-content": {
    title: "Resume content is required",
    description:
      "Upload a readable PDF or paste resume text manually before creating a resume.",
  },
  "invalid-file-type": {
    title: "Upload a PDF file",
    description:
      "Resume upload only supports PDF files. Choose a PDF or paste resume text manually.",
  },
  "file-too-large": {
    title: "Resume PDF is too large",
    description: "Upload a PDF up to 5 MB, or paste resume text manually.",
  },
  "pdf-extraction-failed": {
    title: "PDF text could not be extracted",
    description: "Try another PDF or paste resume text manually.",
  },
} as const;

function getResumeFormErrorMessage(error?: string) {
  if (!error || !(error in resumeFormErrorMessages)) {
    return null;
  }

  return resumeFormErrorMessages[
    error as keyof typeof resumeFormErrorMessages
  ];
}

export default async function NewResumePage({
  searchParams,
}: NewResumePageProps) {
  const params = await searchParams;
  const error = params.error;
  const errorMessage = getResumeFormErrorMessage(error);

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/resumes"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to resumes
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">New resume</h1>
          <p className="mt-2 text-muted-foreground">
            Add a resume version by uploading a PDF or pasting the resume text
            manually.
          </p>
        </div>

        {errorMessage ? (
          <StatusMessage
            variant="error"
            title={errorMessage.title}
            description={errorMessage.description}
          >
            <div className="flex flex-wrap gap-3 font-medium">
              <a href="#pdfFile" className="underline underline-offset-4">
                Choose PDF
              </a>
              <a href="#content" className="underline underline-offset-4">
                Paste resume text
              </a>
            </div>
          </StatusMessage>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Resume details</CardTitle>
            <CardDescription>
              Resume name is required. Add resume content by uploading a PDF or
              pasting text manually.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={createResume} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Resume name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Backend-focused resume v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfFile">Resume PDF</Label>
                <div className="space-y-3 rounded-lg border border-dashed border-[#D9D5C5] bg-[#FBF9F0] p-4 dark:border-slate-800 dark:bg-slate-950/20">
                  <Input
                    id="pdfFile"
                    name="pdfFile"
                    type="file"
                    accept="application/pdf"
                    className="bg-white dark:bg-input/30"
                  />
                  <p className="text-sm text-muted-foreground">
                    Readable PDFs up to 5 MB can be extracted automatically. You
                    can also paste text below; saved text powers AI critique and
                    semantic search.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Resume text fallback</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={14}
                  placeholder="Paste your resume text here if you are not uploading a PDF, or as a fallback."
                />
                <p className="text-sm text-muted-foreground">
                  If PDF extraction succeeds, the extracted text will be saved.
                  If no PDF is uploaded, paste the resume text here.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/resumes">Cancel</Link>
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Create resume
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
