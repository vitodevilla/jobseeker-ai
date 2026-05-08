import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm font-medium text-muted-foreground">
            JobSeeker AI
          </p>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Track your job search and prepare smarter with your own data.
            </h1>

            <p className="text-lg text-muted-foreground">
              JobSeeker AI is a personal job search workspace for applications,
              resumes, cover letters, interviews, tasks, and future AI-assisted
              matching.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/sign-up">Create account</Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Track applications</CardTitle>
              <CardDescription>
                Keep saved jobs, applications, interviews, and follow-ups in one
                place.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage documents</CardTitle>
              <CardDescription>
                Organize resume versions and cover letters for each opportunity.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prepare for AI assistance</CardTitle>
              <CardDescription>
                Build structured career context that future AI features can use
                for personalized recommendations.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </main>
  );
}
