"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationFormSchema } from "@/lib/validations/application";

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

  const parsed = applicationFormSchema.parse({
    jobPostingId: formData.get("jobPostingId"),
    resumeId: formData.get("resumeId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    appliedAt: formData.get("appliedAt"),
    nextActionDate: formData.get("nextActionDate"),
    rejectionReason: formData.get("rejectionReason"),
    notes: formData.get("notes"),
  });

  await verifyJobPostingOwnership(parsed.jobPostingId, userId);
  await verifyResumeOwnership(parsed.resumeId, userId);

  await prisma.application.create({
    data: {
      userId,
      ...parsed,
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

  const parsed = applicationFormSchema.parse({
    jobPostingId: formData.get("jobPostingId"),
    resumeId: formData.get("resumeId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    appliedAt: formData.get("appliedAt"),
    nextActionDate: formData.get("nextActionDate"),
    rejectionReason: formData.get("rejectionReason"),
    notes: formData.get("notes"),
  });

  await verifyJobPostingOwnership(parsed.jobPostingId, userId);
  await verifyResumeOwnership(parsed.resumeId, userId);

  const result = await prisma.application.updateMany({
    where: {
      id: applicationId,
      userId,
    },
    data: parsed,
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
