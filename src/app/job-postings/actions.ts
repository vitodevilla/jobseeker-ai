"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateJobPostingSummary } from "@/lib/ai/job-posting-summary";
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

type JobPostingSummaryContext = {
  description: string;
  location: string | null;
  workMode: string | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  company: {
    industry: string | null;
    notes: string | null;
  };
};

function hasEnoughJobSummaryContext(jobPosting: JobPostingSummaryContext) {
  if (jobPosting.description.trim()) {
    return true;
  }

  return Boolean(
    jobPosting.location ||
      jobPosting.workMode ||
      jobPosting.seniorityLevel ||
      jobPosting.salaryMin !== null ||
      jobPosting.salaryMax !== null ||
      jobPosting.company.industry ||
      jobPosting.company.notes,
  );
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

export async function generateJobPostingAiSummary(jobPostingId: string) {
  const userId = await getSignedInUserId();
  const editPath = `/job-postings/${jobPostingId}/edit`;

  const jobPosting = await prisma.jobPosting.findFirst({
    where: {
      id: jobPostingId,
      userId,
    },
    select: {
      title: true,
      description: true,
      location: true,
      workMode: true,
      seniorityLevel: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      url: true,
      company: {
        select: {
          name: true,
          industry: true,
          website: true,
          notes: true,
        },
      },
    },
  });

  if (!jobPosting) {
    redirect("/job-postings");
  }

  if (!hasEnoughJobSummaryContext(jobPosting)) {
    redirect(`${editPath}?error=missing-job-context`);
  }

  let aiSummary: string;

  try {
    aiSummary = await generateJobPostingSummary({
      jobPostingContext: {
        title: jobPosting.title,
        description: jobPosting.description,
        location: jobPosting.location,
        workMode: jobPosting.workMode,
        seniorityLevel: jobPosting.seniorityLevel,
        salaryMin: jobPosting.salaryMin,
        salaryMax: jobPosting.salaryMax,
        salaryCurrency: jobPosting.salaryCurrency,
        url: jobPosting.url,
        company: {
          name: jobPosting.company.name,
          industry: jobPosting.company.industry,
          website: jobPosting.company.website,
          notes: jobPosting.company.notes,
        },
      },
    });
  } catch {
    redirect(`${editPath}?error=ai-summary-failed`);
  }

  if (!aiSummary) {
    redirect(`${editPath}?error=empty-ai-summary`);
  }

  const result = await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: {
      aiSummary,
      aiSummaryAt: new Date(),
    },
  });

  if (result.count === 0) {
    redirect("/job-postings");
  }

  revalidatePath("/job-postings");
  revalidatePath(editPath);
  redirect(`${editPath}?ai=summary-generated`);
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
