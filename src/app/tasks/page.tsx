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

export default async function TasksPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
    },
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
  });

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
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

        {tasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No tasks yet</CardTitle>
              <CardDescription>
                Add your first follow-up or reminder. Tasks can be standalone or
                linked to an application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/tasks/new">Add task</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Status: {task.status}</p>
                    <p>Priority: {task.priority}</p>

                    {task.dueAt ? (
                      <p>Due: {task.dueAt.toLocaleDateString("hr-HR")}</p>
                    ) : null}

                    {task.completedAt ? (
                      <p>
                        Completed:{" "}
                        {task.completedAt.toLocaleDateString("hr-HR")}
                      </p>
                    ) : null}
                  </div>

                  {task.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}

                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
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
