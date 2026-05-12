import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type AppShellProps = {
  userName: string | null | undefined;
  userEmail: string;
  children: React.ReactNode;
};

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-lg font-semibold">
              JobSeeker AI
            </Link>
            <p className="text-sm text-muted-foreground">
              Track applications, prepare smarter, and use AI with your own
              data.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <nav className="flex gap-4 text-sm">
              <Link
                href="/dashboard"
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/companies"
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Companies
              </Link>
              <Link
                href="/job-postings"
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Job Postings
              </Link>
              <Link
                href="/resumes"
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Resumes
              </Link>
              <Link
                href="/profile"
                className="font-medium text-muted-foreground hover:text-foreground"
              >
                Profile
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium">{userName ?? "User"}</p>
                <p className="text-muted-foreground">{userEmail}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
