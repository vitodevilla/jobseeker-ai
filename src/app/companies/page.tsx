import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CompaniesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const companies = await prisma.company.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="mt-2 text-muted-foreground">
              Save companies you are interested in and keep private notes for
              your job search.
            </p>
          </div>

          <Button asChild>
            <Link href="/companies/new">New company</Link>
          </Button>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No companies yet</CardTitle>
              <CardDescription>
                Add your first company to start building your job search
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/companies/new">Add company</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>
                    {company.industry ?? "No industry added"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {company.website ? <p>{company.website}</p> : null}
                    {company.size ? <p>Size: {company.size}</p> : null}
                    {company.notes ? <p>{company.notes}</p> : null}
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/companies/${company.id}/edit`}>Edit</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
