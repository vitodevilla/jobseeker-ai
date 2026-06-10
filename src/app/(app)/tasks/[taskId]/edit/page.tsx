import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteTask, updateTask } from "@/app/(app)/tasks/actions";
import { FormActions } from "@/components/form-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { DangerZoneCard } from "@/components/danger-zone-card";

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
    <>
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
                  <Select
                    id="applicationId"
                    name="applicationId"
                    defaultValue={task.applicationId ?? ""}
                  >
                    <option value="">Standalone task</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobPosting.title} —{" "}
                        {application.jobPosting.company.name}
                      </option>
                    ))}
                  </Select>
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
                  <Select
                    id="status"
                    name="status"
                    required
                    defaultValue={task.status}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    id="priority"
                    name="priority"
                    required
                    defaultValue={task.priority}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  className="min-h-28"
                  rows={4}
                  defaultValue={task.description ?? ""}
                  placeholder="Optional details about the task..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionNotes">Completion notes</Label>
                <Textarea
                  id="completionNotes"
                  name="completionNotes"
                  className="min-h-28"
                  rows={4}
                  defaultValue={task.completionNotes ?? ""}
                  placeholder="Optional notes after completing the task..."
                />
              </div>

              <FormActions cancelHref="/tasks" submitLabel="Save changes" />
            </form>
          </CardContent>
        </Card>

        <DangerZoneCard
          title="Delete task"
          description="Remove this task from your workspace. This action cannot be undone."
        >
          <DeleteConfirmationForm
            action={deleteTaskWithId}
            title="Delete task?"
            description="This will remove this task from your workspace. This action cannot be undone."
            confirmLabel="Delete task"
            triggerLabel="Delete task"
          />
        </DangerZoneCard>
      </div>
    </>
  );
}
