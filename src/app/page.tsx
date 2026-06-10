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
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-base font-semibold whitespace-nowrap"
          >
            JobSeeker AI
          </Link>

          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="max-w-3xl space-y-6">
            <p className="inline-flex rounded-full border border-[#A3B3C0] bg-[#F2F6FB] px-2.5 py-1 text-xs font-medium text-[#334F70]">
              Job-search workspace
            </p>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                A calmer workspace for your job search.
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Track applications, tasks, interviews, resumes, and cover
                letters in one place. Use your saved records to prepare for the
                next step with context that stays organized.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" asChild>
                <Link href="/sign-up">Create account</Link>
              </Button>

              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Track the pipeline</CardTitle>
                <CardDescription>
                  Keep applications, interviews, and follow-ups moving from one
                  organized view.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keep documents close</CardTitle>
                <CardDescription>
                  Organize resumes and cover letters by opportunity so the right
                  version is easy to find.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prepare from saved context</CardTitle>
                <CardDescription>
                  Review records and next steps with assistant support grounded
                  in your job-search data.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
