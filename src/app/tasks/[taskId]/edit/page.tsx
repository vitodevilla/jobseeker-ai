import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { deleteTask, updateTask } from "@/app/tasks/actions";
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

type EditTaskPageProps = {
  params: Promise<{
    taskId: string;
  }>;
};

function toDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { taskId } = await params;

  const [task, applications] = await Promise.all([
    prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    }),
    prisma.application.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        jobPosting: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  if (!task) {
    notFound();
  }

  const updateTaskWithId = updateTask.bind(null, task.id);
  const deleteTaskWithId = deleteTask.bind(null, task.id);

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <Link
            href="/tasks"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to tasks
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit task</h1>
          <p className="mt-2 text-muted-foreground">
            Update a follow-up, reminder, or application-specific next action.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Task details</CardTitle>
            <CardDescription>
              Fields marked with * are required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateTaskWithId} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Task title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={task.title}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="applicationId">Linked application</Label>
                  <select
                    id="applicationId"
                    name="applicationId"
                    defaultValue={task.applicationId ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">Standalone task</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobPosting.title} —{" "}
                        {application.jobPosting.company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueAt">Due date</Label>
                  <Input
                    id="dueAt"
                    name="dueAt"
                    type="date"
                    defaultValue={toDateInputValue(task.dueAt)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <select
                    id="status"
                    name="status"
                    required
                    defaultValue={task.status}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    defaultValue={task.priority}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={task.description ?? ""}
                  placeholder="Optional details about the task..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionNotes">Completion notes</Label>
                <textarea
                  id="completionNotes"
                  name="completionNotes"
                  rows={4}
                  defaultValue={task.completionNotes ?? ""}
                  placeholder="Optional notes after completing the task..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/tasks">Cancel</Link>
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Delete task</CardTitle>
            <CardDescription>
              Remove this task from your workspace. This action cannot be
              undone.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeleteConfirmationForm
              action={deleteTaskWithId}
              title="Delete task?"
              description="This will remove this task from your workspace. This action cannot be undone."
              confirmLabel="Delete task"
              triggerLabel="Delete task"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
