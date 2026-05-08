import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <AppShell userName={session.user.name} userEmail={session.user.email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {session.user.name}. This is your protected JobSeeker
            AI workspace.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>Track your job applications.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">CRUD comes next.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumes</CardTitle>
              <CardDescription>Manage resume versions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">
                Uploads come later.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Complete your career context.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This will help AI personalize job matching.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
