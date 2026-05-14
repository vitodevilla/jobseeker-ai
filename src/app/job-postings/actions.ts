"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jobPostingFormSchema } from "@/lib/validations/job-posting";

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

  const parsed = jobPostingFormSchema.parse({
    companyId: formData.get("companyId"),
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    workMode: formData.get("workMode"),
    seniorityLevel: formData.get("seniorityLevel"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
    salaryCurrency: formData.get("salaryCurrency"),
    url: formData.get("url"),
    postedAt: formData.get("postedAt"),
    deadline: formData.get("deadline"),
  });

  await verifyCompanyOwnership(parsed.companyId, userId);

  await prisma.jobPosting.create({
    data: {
      userId,
      ...parsed,
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

  const parsed = jobPostingFormSchema.parse({
    companyId: formData.get("companyId"),
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    workMode: formData.get("workMode"),
    seniorityLevel: formData.get("seniorityLevel"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
    salaryCurrency: formData.get("salaryCurrency"),
    url: formData.get("url"),
    postedAt: formData.get("postedAt"),
    deadline: formData.get("deadline"),
  });

  await verifyCompanyOwnership(parsed.companyId, userId);

  const result = await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: parsed,
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
