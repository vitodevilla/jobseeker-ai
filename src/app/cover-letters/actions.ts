"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateCoverLetterCritique } from "@/lib/ai/cover-letter-critique";
import { generateCoverLetterDraft } from "@/lib/ai/cover-letter-generation";
import { prisma } from "@/lib/prisma";
import {
  coverLetterFormSchema,
  coverLetterGenerationSchema,
  manualCoverLetterFormSchema,
} from "@/lib/validations/cover-letter";

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

  const parsed = manualCoverLetterFormSchema.parse({
    applicationId: formData.get("applicationId"),
    title: formData.get("title"),
    mode: formData.get("mode"),
    content: formData.get("content"),
    version: formData.get("version"),
    isFinal: formData.get("isFinal"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  await prisma.coverLetter.create({
    data: {
      userId,
      ...parsed,
    },
  });

  revalidatePath("/cover-letters");
  redirect("/cover-letters");
}

export async function generateCoverLetterDraftForApplication(
  formData: FormData,
) {
  const userId = await getSignedInUserId();

  const parsed = coverLetterGenerationSchema.safeParse({
    applicationId: formData.get("applicationId"),
  });

  if (!parsed.success) {
    redirect("/cover-letters/new?error=missing-application");
  }

  const application = await prisma.application.findFirst({
    where: {
      id: parsed.data.applicationId,
      userId,
    },
    select: {
      id: true,
      status: true,
      priority: true,
      notes: true,
      user: {
        select: {
          targetRole: true,
          currentRole: true,
          targetLocations: true,
          yearsOfExperience: true,
          preferredWorkMode: true,
        },
      },
      resume: {
        select: {
          userId: true,
          name: true,
          content: true,
        },
      },
      jobPosting: {
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
        },
      },
      coverLetters: {
        select: {
          version: true,
        },
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
    },
  });

  if (!application) {
    redirect("/cover-letters/new?error=missing-application");
  }

  const resumeContext =
    application.resume && application.resume.userId === userId
      ? {
          name: application.resume.name,
          content: application.resume.content,
        }
      : null;

  let generatedDraft: string;

  try {
    generatedDraft = await generateCoverLetterDraft({
      careerContext: {
        targetRole: application.user.targetRole,
        currentRole: application.user.currentRole,
        targetLocations: application.user.targetLocations,
        yearsOfExperience: application.user.yearsOfExperience,
        preferredWorkMode: application.user.preferredWorkMode,
      },
      applicationContext: {
        status: application.status,
        priority: application.priority,
        notes: application.notes,
      },
      resumeContext,
      jobPostingContext: {
        title: application.jobPosting.title,
        description: application.jobPosting.description,
        location: application.jobPosting.location,
        workMode: application.jobPosting.workMode,
        seniorityLevel: application.jobPosting.seniorityLevel,
        salaryMin: application.jobPosting.salaryMin,
        salaryMax: application.jobPosting.salaryMax,
        salaryCurrency: application.jobPosting.salaryCurrency,
        company: {
          name: application.jobPosting.company.name,
          industry: application.jobPosting.company.industry,
          website: application.jobPosting.company.website,
          notes: application.jobPosting.company.notes,
        },
      },
    });
  } catch {
    redirect("/cover-letters/new?error=ai-generation-failed");
  }

  if (!generatedDraft) {
    redirect("/cover-letters/new?error=empty-ai-generation");
  }

  const latestVersion = application.coverLetters[0]?.version ?? 0;

  const coverLetter = await prisma.coverLetter.create({
    data: {
      userId,
      applicationId: application.id,
      title: `First draft for ${application.jobPosting.title} at ${application.jobPosting.company.name}`,
      mode: "GENERATED",
      content: generatedDraft,
      version: latestVersion + 1,
      isFinal: false,
    },
    select: {
      id: true,
    },
  });

  revalidatePath("/cover-letters");
  redirect(`/cover-letters/${coverLetter.id}/edit?ai=draft-generated`);
}

export async function updateCoverLetter(
  coverLetterId: string,
  formData: FormData,
) {
  const userId = await getSignedInUserId();

  const parsed = coverLetterFormSchema.parse({
    applicationId: formData.get("applicationId"),
    title: formData.get("title"),
    mode: formData.get("mode"),
    content: formData.get("content"),
    version: formData.get("version"),
    isFinal: formData.get("isFinal"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  const result = await prisma.coverLetter.updateMany({
    where: {
      id: coverLetterId,
      userId,
    },
    data: parsed,
  });

  if (result.count === 0) {
    redirect("/cover-letters");
  }

  revalidatePath("/cover-letters");
  revalidatePath(`/cover-letters/${coverLetterId}/edit`);
  redirect("/cover-letters");
}

export async function generateCoverLetterAiFeedback(coverLetterId: string) {
  const userId = await getSignedInUserId();

  const coverLetter = await prisma.coverLetter.findFirst({
    where: {
      id: coverLetterId,
      userId,
    },
    select: {
      title: true,
      mode: true,
      content: true,
      version: true,
      isFinal: true,
      user: {
        select: {
          targetRole: true,
          currentRole: true,
          targetLocations: true,
          yearsOfExperience: true,
          preferredWorkMode: true,
        },
      },
      application: {
        select: {
          status: true,
          priority: true,
          appliedAt: true,
          nextActionDate: true,
          notes: true,
          jobPosting: {
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
            },
          },
        },
      },
    },
  });

  if (!coverLetter) {
    redirect("/cover-letters");
  }

  const coverLetterContent = coverLetter.content?.trim();

  if (!coverLetterContent) {
    redirect(`/cover-letters/${coverLetterId}/edit?error=missing-content`);
  }

  let aiFeedback: string;

  try {
    aiFeedback = await generateCoverLetterCritique({
      coverLetterTitle: coverLetter.title,
      coverLetterMode: coverLetter.mode,
      coverLetterContent,
      version: coverLetter.version,
      isFinal: coverLetter.isFinal,
      careerContext: {
        targetRole: coverLetter.user.targetRole,
        currentRole: coverLetter.user.currentRole,
        targetLocations: coverLetter.user.targetLocations,
        yearsOfExperience: coverLetter.user.yearsOfExperience,
        preferredWorkMode: coverLetter.user.preferredWorkMode,
      },
      applicationContext: {
        status: coverLetter.application.status,
        priority: coverLetter.application.priority,
        appliedAt: coverLetter.application.appliedAt,
        nextActionDate: coverLetter.application.nextActionDate,
        notes: coverLetter.application.notes,
      },
      jobPostingContext: {
        title: coverLetter.application.jobPosting.title,
        description: coverLetter.application.jobPosting.description,
        location: coverLetter.application.jobPosting.location,
        workMode: coverLetter.application.jobPosting.workMode,
        seniorityLevel: coverLetter.application.jobPosting.seniorityLevel,
        salaryMin: coverLetter.application.jobPosting.salaryMin,
        salaryMax: coverLetter.application.jobPosting.salaryMax,
        salaryCurrency: coverLetter.application.jobPosting.salaryCurrency,
        company: {
          name: coverLetter.application.jobPosting.company.name,
          industry: coverLetter.application.jobPosting.company.industry,
          website: coverLetter.application.jobPosting.company.website,
          notes: coverLetter.application.jobPosting.company.notes,
        },
      },
    });
  } catch {
    redirect(`/cover-letters/${coverLetterId}/edit?error=ai-failed`);
  }

  if (!aiFeedback) {
    redirect(`/cover-letters/${coverLetterId}/edit?error=empty-ai-feedback`);
  }

  const result = await prisma.coverLetter.updateMany({
    where: {
      id: coverLetterId,
      userId,
    },
    data: {
      aiFeedback,
      aiFeedbackAt: new Date(),
    },
  });

  if (result.count === 0) {
    redirect("/cover-letters");
  }

  revalidatePath("/cover-letters");
  revalidatePath(`/cover-letters/${coverLetterId}/edit`);
  redirect(`/cover-letters/${coverLetterId}/edit?ai=generated`);
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
