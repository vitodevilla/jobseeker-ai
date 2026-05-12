"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApplicationStatus, Priority } from "@/generated/prisma";

const allowedStatuses = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "GHOSTED",
  "ARCHIVED",
] as const;

const allowedPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

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

function getNullableDate(formData: FormData, key: string) {
  const value = getNullableString(formData, key);

  if (value === null) {
    return null;
  }

  return new Date(value);
}

function getStatus(formData: FormData) {
  const value = getRequiredString(formData, "status", "Status is required.");

  if (!allowedStatuses.includes(value as ApplicationStatus)) {
    throw new Error("Invalid application status.");
  }

  return value as ApplicationStatus;
}

function getPriority(formData: FormData) {
  const value = getRequiredString(
    formData,
    "priority",
    "Priority is required.",
  );

  if (!allowedPriorities.includes(value as Priority)) {
    throw new Error("Invalid priority.");
  }

  return value as Priority;
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

async function verifyJobPostingOwnership(jobPostingId: string, userId: string) {
  const jobPosting = await prisma.jobPosting.findFirst({
    where: {
      id: jobPostingId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!jobPosting) {
    throw new Error("Selected job posting was not found.");
  }
}

async function verifyResumeOwnership(resumeId: string | null, userId: string) {
  if (resumeId === null) {
    return;
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!resume) {
    throw new Error("Selected resume was not found.");
  }
}

export async function createApplication(formData: FormData) {
  const userId = await getSignedInUserId();

  const jobPostingId = getRequiredString(
    formData,
    "jobPostingId",
    "Job posting is required.",
  );

  const resumeId = getNullableString(formData, "resumeId");

  await verifyJobPostingOwnership(jobPostingId, userId);
  await verifyResumeOwnership(resumeId, userId);

  await prisma.application.create({
    data: {
      userId,
      jobPostingId,
      resumeId,
      status: getStatus(formData),
      priority: getPriority(formData),
      appliedAt: getNullableDate(formData, "appliedAt"),
      nextActionDate: getNullableDate(formData, "nextActionDate"),
      rejectionReason: getNullableString(formData, "rejectionReason"),
      notes: getNullableString(formData, "notes"),
    },
  });

  revalidatePath("/applications");
  redirect("/applications");
}

export async function updateApplication(
  applicationId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();

  const jobPostingId = getRequiredString(
    formData,
    "jobPostingId",
    "Job posting is required.",
  );

  const resumeId = getNullableString(formData, "resumeId");

  await verifyJobPostingOwnership(jobPostingId, userId);
  await verifyResumeOwnership(resumeId, userId);

  const result = await prisma.application.updateMany({
    where: {
      id: applicationId,
      userId,
    },
    data: {
      jobPostingId,
      resumeId,
      status: getStatus(formData),
      priority: getPriority(formData),
      appliedAt: getNullableDate(formData, "appliedAt"),
      nextActionDate: getNullableDate(formData, "nextActionDate"),
      rejectionReason: getNullableString(formData, "rejectionReason"),
      notes: getNullableString(formData, "notes"),
    },
  });

  if (result.count === 0) {
    redirect("/applications");
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${applicationId}/edit`);
  redirect("/applications");
}

export async function deleteApplication(applicationId: string) {
  const userId = await getSignedInUserId();

  await prisma.application.deleteMany({
    where: {
      id: applicationId,
      userId,
    },
  });

  revalidatePath("/applications");
  redirect("/applications");
}
