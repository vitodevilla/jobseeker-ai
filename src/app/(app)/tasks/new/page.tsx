import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTask } from "@/app/(app)/tasks/actions";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewTaskPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const applications = await prisma.application.findMany({
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
  });

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

          <h1 className="mt-4 text-3xl font-bold tracking-tight">New task</h1>
          <p className="mt-2 text-muted-foreground">
            Add a standalone reminder or link it to an existing application.
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
            <form action={createTask} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Task title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Follow up with recruiter"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="applicationId">Linked application</Label>
                  <Select
                    id="applicationId"
                    name="applicationId"
                    defaultValue=""
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
                  <Input id="dueAt" name="dueAt" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    id="status"
                    name="status"
                    required
                    defaultValue="PENDING"
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
                    defaultValue="MEDIUM"
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
                  rows={4}
                  placeholder="Optional details about the task..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionNotes">Completion notes</Label>
                <Textarea
                  id="completionNotes"
                  name="completionNotes"
                  rows={4}
                  placeholder="Optional notes after completing the task..."
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/tasks">Cancel</Link>
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Create task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
