import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { updateProfile } from "@/app/profile/actions";
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
    <AppShell userName={user.name} userEmail={user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Add your career context so JobSeeker AI can personalize matching,
            summaries, and future AI assistance.
          </p>
        </div>

        {params.updated ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Profile updated successfully.
          </p>
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
                  <select
                    id="preferredWorkMode"
                    name="preferredWorkMode"
                    defaultValue={user.preferredWorkMode ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="">No preference yet</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </select>
                </div>
              </div>

              <Button type="submit">Save profile</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
