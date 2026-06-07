"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isNavHrefActive } from "@/components/app-nav-link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  href: string;
  label: string;
};

type MobileNavGroup = {
  label: string;
  items: MobileNavItem[];
};

type MobileNavProps = {
  navGroups: MobileNavGroup[];
  userName: string | null | undefined;
  userEmail: string;
};

export function MobileNav({ navGroups, userName, userEmail }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const displayName = userName ?? "User";

  return (
    <div className="lg:hidden">
      <div className="flex min-h-16 items-center justify-between gap-4 py-3">
        <Link
          href="/dashboard"
          className="block min-w-0 truncate text-lg font-semibold"
          onClick={() => setOpen(false)}
        >
          JobSeeker AI
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span>Menu</span>
        </Button>
      </div>

      {open ? (
        <nav
          id="mobile-navigation"
          aria-label="Primary navigation"
          className="border-t py-3"
        >
          <div className="flex flex-col gap-4">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>

                <div className="flex flex-col">
                  {group.items.map((item) => {
                    const active = isNavHrefActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {group.label === "Account" ? (
                  <div className="mt-2 space-y-2 px-2">
                    <div className="rounded-md bg-muted/60 p-3 text-sm">
                      <p className="truncate font-medium">{displayName}</p>
                      <p className="truncate text-muted-foreground">
                        {userEmail}
                      </p>
                    </div>

                    <LogoutButton className="block w-full border-border bg-background text-left hover:bg-muted" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
