import Link from "next/link";
import { CheckSquareIcon } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge, StatusBadge } from "@/components/job-search-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/display-formatters";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Prisma, Priority, TaskStatus } from "@/generated/prisma";

const PAGE_SIZE = 10;

const taskStatuses: TaskStatus[] = ["PENDING", "DONE", "CANCELLED"];
const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];

type TasksPageProps = {
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

  return `/tasks?${params.toString()}`;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
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

  const normalizedQuery = query.toUpperCase();

  const matchingStatuses = taskStatuses.filter((status) =>
    status.includes(normalizedQuery),
  );

  const matchingPriorities = priorities.filter((priority) =>
    priority.includes(normalizedQuery),
  );

  const where: Prisma.TaskWhereInput = {
    userId: session.user.id,
    ...(query
      ? {
          OR: [
            ...(matchingStatuses.length > 0
              ? [
                  {
                    status: {
                      in: matchingStatuses,
                    },
                  },
                ]
              : []),
            ...(matchingPriorities.length > 0
              ? [
                  {
                    priority: {
                      in: matchingPriorities,
                    },
                  },
                ]
              : []),
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              completionNotes: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              application: {
                jobPosting: {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              application: {
                jobPosting: {
                  company: {
                    name: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
            {
              application: {
                jobPosting: {
                  company: {
                    industry: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [tasks, totalTasks] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        application: {
          include: {
            jobPosting: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          dueAt: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: PAGE_SIZE,
      skip,
    }),
    prisma.task.count({
      where,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="mt-2 text-muted-foreground">
              Track follow-ups, reminders, and next actions for your job search.
            </p>
          </div>

          <Button asChild>
            <Link href="/tasks/new">New task</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search tasks</CardTitle>
            <CardDescription>
              Search by title, description, status, priority, completion notes,
              linked job, or company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/tasks" className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search tasks..."
              />
              <Button type="submit">Search</Button>
              {query ? (
                <Button variant="outline" asChild>
                  <Link href="/tasks">Clear</Link>
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {tasks.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={CheckSquareIcon}
                title={query ? "No matching tasks" : "No tasks yet"}
                description={
                  query
                    ? "Try a different search term or clear the search."
                    : "Add your first follow-up or reminder. Tasks can be standalone or linked to an application."
                }
              >
                {query ? (
                  <Button variant="outline" asChild>
                    <Link href="/tasks">Clear search</Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/tasks/new">Add task</Link>
                  </Button>
                )}
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words">
                Showing {tasks.length} of {totalTasks}{" "}
                {query ? "matching " : ""}
                tasks
              </p>
              <p>
                Page {page} of {totalPages}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <CardTitle>{task.title}</CardTitle>
                    <CardDescription>
                      {task.application
                        ? `${task.application.jobPosting.title} — ${task.application.jobPosting.company.name}`
                        : "Standalone task"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>

                    <div className="space-y-1 break-words text-sm text-muted-foreground">
                      {task.dueAt ? (
                        <p>Due: {formatDisplayDate(task.dueAt)}</p>
                      ) : null}

                      {task.completedAt ? (
                        <p>
                          Completed:{" "}
                          {formatDisplayDate(task.completedAt)}
                        </p>
                      ) : null}
                    </div>

                    {task.description ? (
                      <p className="line-clamp-3 break-words text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="mt-auto flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      asChild
                    >
                      <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
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
