"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedWorkModes = ["REMOTE", "HYBRID", "ONSITE", "FLEXIBLE"] as const;

function getNullableString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
}

export async function updateProfile(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const yearsRaw = getNullableString(formData, "yearsOfExperience");
  const yearsOfExperience = yearsRaw ? Number.parseInt(yearsRaw, 10) : null;

  if (
    yearsOfExperience !== null &&
    (!Number.isInteger(yearsOfExperience) || yearsOfExperience < 0)
  ) {
    throw new Error("Years of experience must be a positive number.");
  }

  const preferredWorkModeRaw = getNullableString(formData, "preferredWorkMode");

  if (
    preferredWorkModeRaw !== null &&
    !allowedWorkModes.includes(
      preferredWorkModeRaw as (typeof allowedWorkModes)[number],
    )
  ) {
    throw new Error("Invalid work mode.");
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      targetRole: getNullableString(formData, "targetRole"),
      targetLocations: getNullableString(formData, "targetLocations"),
      yearsOfExperience,
      currentRole: getNullableString(formData, "currentRole"),
      preferredWorkMode: preferredWorkModeRaw as
        | "REMOTE"
        | "HYBRID"
        | "ONSITE"
        | "FLEXIBLE"
        | null,
    },
  });

  revalidatePath("/profile");
  redirect("/profile?updated=1");
}
