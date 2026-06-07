import Link from "next/link";
import { AppNavLink } from "@/components/app-nav-link";
import { AssistantShell } from "@/components/assistant-shell";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";

type AppShellProps = {
  userName: string | null | undefined;
  userEmail: string;
  children: React.ReactNode;
};

type AppNavItem = {
  href: string;
  label: string;
};

type AppNavGroup = {
  label: string;
  items: AppNavItem[];
};

const navGroups: AppNavGroup[] = [
  {
    label: "Main",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Track",
    items: [
      { href: "/applications", label: "Applications" },
      { href: "/tasks", label: "Tasks" },
      { href: "/interviews", label: "Interviews" },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/job-postings", label: "Jobs" },
      { href: "/companies", label: "Companies" },
      { href: "/resumes", label: "Resumes" },
      { href: "/cover-letters", label: "Cover letters" },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/profile", label: "Profile" }],
  },
];

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  const displayName = userName ?? "User";
  const desktopNavItems = navGroups.flatMap((group) => group.items);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-4">
          <MobileNav
            navGroups={navGroups}
            userEmail={userEmail}
            userName={userName}
          />

          <div className="hidden py-4 lg:block">
            <div className="flex items-start justify-between gap-8">
              <div className="min-w-0">
                <Link
                  href="/dashboard"
                  className="text-lg font-semibold whitespace-nowrap"
                >
                  JobSeeker AI
                </Link>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Track applications, prepare smarter, and use AI with your own
                  data.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="max-w-72 text-right text-sm">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-muted-foreground">{userEmail}</p>
                </div>
                <LogoutButton />
              </div>
            </div>

            <nav
              aria-label="Primary navigation"
              className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm"
            >
              {desktopNavItems.map((item) => (
                <AppNavLink
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-transparent px-2.5 py-1.5 font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  activeClassName="border-border bg-muted text-foreground"
                  inactiveClassName="text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  {item.label}
                </AppNavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:pb-24 lg:pb-12">
        {children}
      </main>
      <AssistantShell />
    </div>
  );
}
