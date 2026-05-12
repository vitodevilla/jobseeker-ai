import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { createResume } from "@/app/resumes/actions";
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

export default async function NewResumePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

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

          <h1 className="mt-4 text-3xl font-bold tracking-tight">New resume</h1>
          <p className="mt-2 text-muted-foreground">
            Add a resume version by pasting its text. PDF upload and extraction
            will be added later.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
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
                <Label htmlFor="content">Resume content *</Label>
                <textarea
                  id="content"
                  name="content"
                  required
                  rows={14}
                  placeholder="Paste your resume text here..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/resumes">Cancel</Link>
                </Button>
                <Button type="submit">Create resume</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
