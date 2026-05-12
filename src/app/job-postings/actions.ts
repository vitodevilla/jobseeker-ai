"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorkMode } from "@/generated/prisma";

const allowedWorkModes = ["REMOTE", "HYBRID", "ONSITE", "FLEXIBLE"] as const;

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

  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return parsed;
}

function getNullableDate(formData: FormData, key: string) {
  const value = getNullableString(formData, key);

  if (value === null) {
    return null;
  }

  return new Date(value);
}

function getNullableWorkMode(formData: FormData) {
  const value = getNullableString(formData, "workMode");

  if (value === null) {
    return null;
  }

  if (!allowedWorkModes.includes(value as WorkMode)) {
    throw new Error("Invalid work mode.");
  }

  return value as WorkMode;
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

async function verifyCompanyOwnership(companyId: string, userId: string) {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!company) {
    throw new Error("Selected company was not found.");
  }
}

export async function createJobPosting(formData: FormData) {
  const userId = await getSignedInUserId();

  const companyId = getRequiredString(
    formData,
    "companyId",
    "Company is required.",
  );

  await verifyCompanyOwnership(companyId, userId);

  const title = getRequiredString(formData, "title", "Job title is required.");

  const description = getRequiredString(
    formData,
    "description",
    "Job description is required.",
  );

  await prisma.jobPosting.create({
    data: {
      userId,
      companyId,
      title,
      description,
      location: getNullableString(formData, "location"),
      workMode: getNullableWorkMode(formData),
      seniorityLevel: getNullableString(formData, "seniorityLevel"),
      salaryMin: getNullableInt(formData, "salaryMin"),
      salaryMax: getNullableInt(formData, "salaryMax"),
      salaryCurrency: getNullableString(formData, "salaryCurrency"),
      url: getNullableString(formData, "url"),
      postedAt: getNullableDate(formData, "postedAt"),
      deadline: getNullableDate(formData, "deadline"),
    },
  });

  revalidatePath("/job-postings");
  redirect("/job-postings");
}

export async function updateJobPosting(
  jobPostingId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();

  const companyId = getRequiredString(
    formData,
    "companyId",
    "Company is required.",
  );

  await verifyCompanyOwnership(companyId, userId);

  const title = getRequiredString(formData, "title", "Job title is required.");

  const description = getRequiredString(
    formData,
    "description",
    "Job description is required.",
  );

  const result = await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: {
      companyId,
      title,
      description,
      location: getNullableString(formData, "location"),
      workMode: getNullableWorkMode(formData),
      seniorityLevel: getNullableString(formData, "seniorityLevel"),
      salaryMin: getNullableInt(formData, "salaryMin"),
      salaryMax: getNullableInt(formData, "salaryMax"),
      salaryCurrency: getNullableString(formData, "salaryCurrency"),
      url: getNullableString(formData, "url"),
      postedAt: getNullableDate(formData, "postedAt"),
      deadline: getNullableDate(formData, "deadline"),
    },
  });

  if (result.count === 0) {
    redirect("/job-postings");
  }

  revalidatePath("/job-postings");
  revalidatePath(`/job-postings/${jobPostingId}/edit`);
  redirect("/job-postings");
}

export async function deleteJobPosting(jobPostingId: string) {
  const userId = await getSignedInUserId();

  await prisma.jobPosting.deleteMany({
    where: {
      id: jobPostingId,
      userId,
    },
  });

  revalidatePath("/job-postings");
  redirect("/job-postings");
}
