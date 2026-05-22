"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateJobPostingSummary } from "@/lib/ai/job-posting-summary";
import {
  EmptyResumeJobMatchOutputError,
  generateResumeJobMatch,
  InvalidResumeJobMatchOutputError,
} from "@/lib/ai/resume-job-match";
import { generateResumeTailoringSuggestions as generateResumeTailoringSuggestionsWithAi } from "@/lib/ai/resume-tailoring-suggestions";
import { prisma } from "@/lib/prisma";
import { jobPostingFormSchema } from "@/lib/validations/job-posting";

const resumeSelectionFormSchema = z.object({
  resumeId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1),
  ),
});

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

type ResumeJobMatchContext = {
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

function hasEnoughResumeJobMatchContext(jobPosting: ResumeJobMatchContext) {
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

export async function analyzeResumeJobMatch(
  jobPostingId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();
  const editPath = `/job-postings/${jobPostingId}/edit`;

  const parsed = resumeSelectionFormSchema.safeParse({
    resumeId: formData.get("resumeId"),
  });

  if (!parsed.success) {
    redirect(`${editPath}?error=missing-resume`);
  }

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
      company: {
        select: {
          name: true,
          industry: true,
          website: true,
          notes: true,
        },
      },
      user: {
        select: {
          targetRole: true,
          currentRole: true,
          targetLocations: true,
          yearsOfExperience: true,
          preferredWorkMode: true,
        },
      },
    },
  });

  if (!jobPosting) {
    redirect("/job-postings");
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: parsed.data.resumeId,
      userId,
    },
    select: {
      id: true,
      name: true,
      content: true,
    },
  });

  if (!resume) {
    redirect(`${editPath}?error=missing-resume`);
  }

  const resumeContent = resume.content.trim();

  if (!resumeContent) {
    redirect(`${editPath}?error=missing-resume-content`);
  }

  if (!hasEnoughResumeJobMatchContext(jobPosting)) {
    redirect(`${editPath}?error=missing-job-context`);
  }

  let match: Awaited<ReturnType<typeof generateResumeJobMatch>>;

  try {
    match = await generateResumeJobMatch({
      careerContext: {
        targetRole: jobPosting.user.targetRole,
        currentRole: jobPosting.user.currentRole,
        targetLocations: jobPosting.user.targetLocations,
        yearsOfExperience: jobPosting.user.yearsOfExperience,
        preferredWorkMode: jobPosting.user.preferredWorkMode,
      },
      resumeContext: {
        name: resume.name,
        content: resumeContent,
      },
      jobPostingContext: {
        title: jobPosting.title,
        description: jobPosting.description,
        location: jobPosting.location,
        workMode: jobPosting.workMode,
        seniorityLevel: jobPosting.seniorityLevel,
        salaryMin: jobPosting.salaryMin,
        salaryMax: jobPosting.salaryMax,
        salaryCurrency: jobPosting.salaryCurrency,
        company: {
          name: jobPosting.company.name,
          industry: jobPosting.company.industry,
          website: jobPosting.company.website,
          notes: jobPosting.company.notes,
        },
      },
    });
  } catch (error) {
    if (error instanceof EmptyResumeJobMatchOutputError) {
      redirect(`${editPath}?error=empty-ai-match`);
    }

    if (error instanceof InvalidResumeJobMatchOutputError) {
      redirect(`${editPath}?error=invalid-ai-match`);
    }

    redirect(`${editPath}?error=ai-match-failed`);
  }

  if (!match.matchAnalysis.trim()) {
    redirect(`${editPath}?error=empty-ai-match`);
  }

  const result = await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: {
      matchScore: match.result.score,
      matchScoreAt: new Date(),
      matchAnalysis: match.matchAnalysis,
      matchResumeId: resume.id,
    },
  });

  if (result.count === 0) {
    redirect("/job-postings");
  }

  revalidatePath("/job-postings");
  revalidatePath(editPath);
  redirect(`${editPath}?ai=match-generated`);
}

export async function generateResumeTailoringSuggestions(
  jobPostingId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();
  const editPath = `/job-postings/${jobPostingId}/edit`;

  const parsed = resumeSelectionFormSchema.safeParse({
    resumeId: formData.get("resumeId"),
  });

  if (!parsed.success) {
    redirect(`${editPath}?error=missing-resume`);
  }

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
      matchScore: true,
      matchAnalysis: true,
      matchResumeId: true,
      company: {
        select: {
          name: true,
          industry: true,
          website: true,
          notes: true,
        },
      },
      user: {
        select: {
          targetRole: true,
          currentRole: true,
          targetLocations: true,
          yearsOfExperience: true,
          preferredWorkMode: true,
        },
      },
    },
  });

  if (!jobPosting) {
    redirect("/job-postings");
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: parsed.data.resumeId,
      userId,
    },
    select: {
      id: true,
      name: true,
      content: true,
    },
  });

  if (!resume) {
    redirect(`${editPath}?error=missing-resume`);
  }

  const resumeContent = resume.content.trim();

  if (!resumeContent) {
    redirect(`${editPath}?error=missing-resume-content`);
  }

  if (!hasEnoughResumeJobMatchContext(jobPosting)) {
    redirect(`${editPath}?error=missing-job-context`);
  }

  const matchAnalysis = jobPosting.matchAnalysis?.trim();
  const savedJobMatchContext =
    jobPosting.matchResumeId === resume.id && matchAnalysis
      ? {
          score: jobPosting.matchScore,
          analysis: matchAnalysis,
        }
      : null;

  let tailoringSuggestions: string;

  try {
    tailoringSuggestions = await generateResumeTailoringSuggestionsWithAi({
      careerContext: {
        targetRole: jobPosting.user.targetRole,
        currentRole: jobPosting.user.currentRole,
        targetLocations: jobPosting.user.targetLocations,
        yearsOfExperience: jobPosting.user.yearsOfExperience,
        preferredWorkMode: jobPosting.user.preferredWorkMode,
      },
      resumeContext: {
        name: resume.name,
        content: resumeContent,
      },
      jobPostingContext: {
        title: jobPosting.title,
        description: jobPosting.description,
        location: jobPosting.location,
        workMode: jobPosting.workMode,
        seniorityLevel: jobPosting.seniorityLevel,
        salaryMin: jobPosting.salaryMin,
        salaryMax: jobPosting.salaryMax,
        salaryCurrency: jobPosting.salaryCurrency,
        company: {
          name: jobPosting.company.name,
          industry: jobPosting.company.industry,
          website: jobPosting.company.website,
          notes: jobPosting.company.notes,
        },
      },
      savedJobMatchContext,
    });
  } catch {
    redirect(`${editPath}?error=ai-tailoring-failed`);
  }

  if (!tailoringSuggestions.trim()) {
    redirect(`${editPath}?error=empty-ai-tailoring`);
  }

  const result = await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: {
      tailoringSuggestions,
      tailoringSuggestionsAt: new Date(),
      tailoringResumeId: resume.id,
    },
  });

  if (result.count === 0) {
    redirect("/job-postings");
  }

  revalidatePath("/job-postings");
  revalidatePath(editPath);
  redirect(`${editPath}?ai=tailoring-generated`);
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
