"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CoverLetterMode } from "@/generated/prisma";

const allowedModes = ["WRITTEN", "UPLOADED", "GENERATED"] as const;

function getNullableString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
}

function getRequiredString(formData: FormData, key: string, message: string) {
  const value = formData.get(key)?.toString().trim();

  if (!value) {
    throw new Error(message);
  }

  return value;
}

function getNullableInt(formData: FormData, key: string) {
  const value = getNullableString(formData, key);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a valid positive number.`);
  }

  return parsed;
}

function getCoverLetterMode(formData: FormData) {
  const value = getRequiredString(formData, "mode", "Mode is required.");

  if (!allowedModes.includes(value as CoverLetterMode)) {
    throw new Error("Invalid cover letter mode.");
  }

  return value as CoverLetterMode;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function getSignedInUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session.user.id;
}

async function verifyApplicationOwnership(
  applicationId: string,
  userId: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!application) {
    throw new Error("Selected application was not found.");
  }
}

export async function createCoverLetter(formData: FormData) {
  const userId = await getSignedInUserId();

  const applicationId = getRequiredString(
    formData,
    "applicationId",
    "Application is required.",
  );

  await verifyApplicationOwnership(applicationId, userId);

  const version = getNullableInt(formData, "version") ?? 1;

  await prisma.coverLetter.create({
    data: {
      userId,
      applicationId,
      title: getRequiredString(formData, "title", "Title is required."),
      mode: getCoverLetterMode(formData),
      content: getNullableString(formData, "content"),
      version,
      isFinal: getBoolean(formData, "isFinal"),
    },
  });

  revalidatePath("/cover-letters");
  redirect("/cover-letters");
}

export async function updateCoverLetter(
  coverLetterId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();

  const applicationId = getRequiredString(
    formData,
    "applicationId",
    "Application is required.",
  );

  await verifyApplicationOwnership(applicationId, userId);

  const version = getNullableInt(formData, "version") ?? 1;

  const result = await prisma.coverLetter.updateMany({
    where: {
      id: coverLetterId,
      userId,
    },
    data: {
      applicationId,
      title: getRequiredString(formData, "title", "Title is required."),
      mode: getCoverLetterMode(formData),
      content: getNullableString(formData, "content"),
      version,
      isFinal: getBoolean(formData, "isFinal"),
    },
  });

  if (result.count === 0) {
    redirect("/cover-letters");
  }

  revalidatePath("/cover-letters");
  revalidatePath(`/cover-letters/${coverLetterId}/edit`);
  redirect("/cover-letters");
}

export async function deleteCoverLetter(coverLetterId: string) {
  const userId = await getSignedInUserId();

  await prisma.coverLetter.deleteMany({
    where: {
      id: coverLetterId,
      userId,
    },
  });

  revalidatePath("/cover-letters");
  redirect("/cover-letters");
}
