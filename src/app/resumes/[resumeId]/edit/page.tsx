import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { deleteResume, updateResume } from "@/app/resumes/actions";
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
    error?: string;
  }>;
};

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

  const updateResumeWithId = updateResume.bind(null, resume.id);
  const deleteResumeWithId = deleteResume.bind(null, resume.id);

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
