"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();

    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        "rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted",
        className
      )}
    >
      Sign out
    </button>
  );
}
