import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInterview } from "@/app/(app)/interviews/actions";
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

export default async function NewInterviewPage() {
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
            href="/interviews"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to interviews
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            New interview
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add an interview round linked to one of your applications.
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription>
                Interviews must be linked to an application. Create an
                application first, then return to schedule the interview round.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/applications/new">Create application</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Interview details</CardTitle>
              <CardDescription>
                Fields marked with * are required.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form action={createInterview} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="applicationId">Application *</Label>
                  <Select
                    id="applicationId"
                    name="applicationId"
                    required
                  >
                    <option value="">Select an application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobPosting.title} —{" "}
                        {application.jobPosting.company.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Interview type *</Label>
                    <Select
                      id="type"
                      name="type"
                      required
                      defaultValue="PHONE_SCREEN"
                    >
                      <option value="PHONE_SCREEN">Phone screen</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="BEHAVIORAL">Behavioral</option>
                      <option value="SYSTEM_DESIGN">System design</option>
                      <option value="CASE_STUDY">Case study</option>
                      <option value="IN_PERSON">In person</option>
                      <option value="FINAL">Final</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Scheduled at *</Label>
                    <Input
                      id="scheduledAt"
                      name="scheduledAt"
                      type="datetime-local"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Duration minutes</Label>
                    <Input
                      id="durationMinutes"
                      name="durationMinutes"
                      type="number"
                      min="0"
                      placeholder="60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome *</Label>
                    <Select
                      id="outcome"
                      name="outcome"
                      required
                      defaultValue="PENDING"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PASSED">Passed</option>
                      <option value="FAILED">Failed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="NO_SHOW">No show</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="locationOrLink">Location or link</Label>
                    <Input
                      id="locationOrLink"
                      name="locationOrLink"
                      placeholder="Office address or meeting link"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interviewerName">Interviewer name</Label>
                    <Input
                      id="interviewerName"
                      name="interviewerName"
                      placeholder="e.g. Ana Horvat"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interviewerEmail">Interviewer email</Label>
                    <Input
                      id="interviewerEmail"
                      name="interviewerEmail"
                      type="email"
                      placeholder="ana@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prepNotes">Prep notes</Label>
                  <Textarea
                    id="prepNotes"
                    name="prepNotes"
                    rows={5}
                    placeholder="What should you prepare before this interview?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    name="feedback"
                    rows={5}
                    placeholder="Reflection or feedback after the interview..."
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full sm:w-auto" asChild>
                    <Link href="/interviews">Cancel</Link>
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    Create interview
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
