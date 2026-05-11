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

type EditResumePageProps = {
  params: Promise<{
    resumeId: string;
  }>;
};

export default async function EditResumePage({ params }: EditResumePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { resumeId } = await params;

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
            Update this resume version. PDF upload will be added later.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume details</CardTitle>
            <CardDescription>
              Resume name and content are required.
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
                <Label htmlFor="content">Resume content *</Label>
                <textarea
                  id="content"
                  name="content"
                  required
                  rows={14}
                  defaultValue={resume.content}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
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
            <form action={deleteResumeWithId}>
              <Button type="submit" variant="destructive">
                Delete resume
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
