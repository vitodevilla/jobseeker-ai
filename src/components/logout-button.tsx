"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
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
      className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
    >
      Sign out
    </button>
  );
}
