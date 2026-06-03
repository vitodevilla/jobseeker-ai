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
                  <select
                    id="applicationId"
                    name="applicationId"
                    defaultValue=""
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
                  <Input id="dueAt" name="dueAt" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <select
                    id="status"
                    name="status"
                    required
                    defaultValue="PENDING"
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
                    defaultValue="MEDIUM"
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
                  placeholder="Optional notes after completing the task..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/tasks">Cancel</Link>
                </Button>
                <Button type="submit">Create task</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
