"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type AppNavLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "href" | "aria-current"
> & {
  href: string;
  activeClassName: string;
  inactiveClassName: string;
};

export function isNavHrefActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavLink({
  href,
  className,
  activeClassName,
  inactiveClassName,
  ...props
}: AppNavLinkProps) {
  const pathname = usePathname();
  const active = isNavHrefActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active ? activeClassName : inactiveClassName)}
      {...props}
    />
  );
}
