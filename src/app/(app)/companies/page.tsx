import Link from "next/link";
import { Building2Icon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PAGE_SIZE = 10;

type CompaniesPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function getPageNumber(page?: string) {
  const parsed = Number.parseInt(page ?? "1", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function buildPageHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  params.set("page", page.toString());

  return `/companies?${params.toString()}`;
}

export default async function CompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = getPageNumber(params.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    userId: session.user.id,
    ...(query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              website: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              industry: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              size: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              notes: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [companies, totalCompanies] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.company.count({
      where,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <>
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

        <Card>
          <CardHeader>
            <CardTitle>Search companies</CardTitle>
            <CardDescription>
              Search by name, website, industry, size, or private notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/companies"
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search companies..."
              />
              <Button type="submit">Search</Button>
              {query ? (
                <Button variant="outline" asChild>
                  <Link href="/companies">Clear</Link>
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {companies.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Building2Icon}
                title={query ? "No matching companies" : "No companies yet"}
                description={
                  query
                    ? "Try a different search term or clear the search."
                    : "Add your first company to start building your job search workspace."
                }
              >
                {query ? (
                  <Button variant="outline" asChild>
                    <Link href="/companies">Clear search</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/companies/new">Add company</Link>
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words">
                Showing {companies.length} of {totalCompanies}{" "}
                {query ? "matching " : ""}
                companies
              </p>
              <p>
                Page {page} of {totalPages}
              </p>
            </div>

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
                    <div className="space-y-1 break-words text-sm text-muted-foreground">
                      {company.website ? (
                        <p className="break-all">{company.website}</p>
                      ) : null}
                      {company.size ? <p>Size: {company.size}</p> : null}
                      {company.notes ? <p>{company.notes}</p> : null}
                    </div>
                  </CardContent>

                  <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href={`/companies/${company.id}/edit`}>Edit</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" disabled={!hasPreviousPage} asChild>
                {hasPreviousPage ? (
                  <Link href={buildPageHref(page - 1, query)}>Previous</Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>

              <Button variant="outline" disabled={!hasNextPage} asChild>
                {hasNextPage ? (
                  <Link href={buildPageHref(page + 1, query)}>Next</Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
