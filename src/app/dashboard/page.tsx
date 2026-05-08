import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/ui/logout-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Signed in as</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {session.user.name}
        </h1>
        <p className="text-sm text-gray-600">{session.user.email}</p>
        <div className="pt-4">
          <LogoutButton />
        </div>
      </div>

      <section className="mt-10 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="mt-2 text-sm text-gray-600">
          This is your protected JobSeeker AI dashboard. Only signed-in users
          should be able to see this page.
        </p>
      </section>
    </main>
  );
}
