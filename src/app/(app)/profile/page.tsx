import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/app/(app)/profile/actions";
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
import { StatusMessage } from "@/components/ui/status-message";

type ProfilePageProps = {
  searchParams: Promise<{
    updated?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      name: true,
      email: true,
      targetRole: true,
      targetLocations: true,
      yearsOfExperience: true,
      currentRole: true,
      preferredWorkMode: true,
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Add your career context so JobSeeker AI can personalize matching,
            summaries, and future AI assistance.
          </p>
        </div>

        {params.updated ? (
          <StatusMessage
            variant="success"
            title="Profile updated successfully."
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Career context</CardTitle>
            <CardDescription>
              These fields will later help the AI understand your job search
              goals.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={updateProfile} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target role</Label>
                  <Input
                    id="targetRole"
                    name="targetRole"
                    defaultValue={user.targetRole ?? ""}
                    placeholder="e.g. Junior Frontend Developer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentRole">Current role</Label>
                  <Input
                    id="currentRole"
                    name="currentRole"
                    defaultValue={user.currentRole ?? ""}
                    placeholder="e.g. Student, QA Intern"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetLocations">Target locations</Label>
                  <Input
                    id="targetLocations"
                    name="targetLocations"
                    defaultValue={user.targetLocations ?? ""}
                    placeholder="e.g. Zagreb, Remote, Berlin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of experience</Label>
                  <Input
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    min="0"
                    defaultValue={user.yearsOfExperience ?? ""}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="preferredWorkMode">Preferred work mode</Label>
                  <Select
                    id="preferredWorkMode"
                    name="preferredWorkMode"
                    defaultValue={user.preferredWorkMode ?? ""}
                  >
                    <option value="">No preference yet</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </Select>
                </div>
              </div>

              <FormActions cancelHref="/dashboard" submitLabel="Save profile" />
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
