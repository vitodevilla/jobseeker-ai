import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { createCompany } from "@/app/companies/actions";
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

export default async function NewCompanyPage() {
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
            href="/companies"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to companies
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            New company
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add a company you are interested in or have applied to.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>
              Only the company name is required. You can add more context later.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={createCompany} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Company name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Infobip"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    name="industry"
                    placeholder="e.g. SaaS, fintech, retail"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    name="size"
                    placeholder="e.g. 11-50, Enterprise"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Private notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  placeholder="What do you know about this company? Why is it interesting?"
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/companies">Cancel</Link>
                </Button>
                <Button type="submit">Create company</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
