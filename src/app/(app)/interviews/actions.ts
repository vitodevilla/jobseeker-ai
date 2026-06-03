"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateInterviewPrepNotes as generateInterviewPrepNotesWithAi } from "@/lib/ai/interview-prep";
import { prisma } from "@/lib/prisma";
import { interviewFormSchema } from "@/lib/validations/interview";

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

function hasEnoughJobContext(jobPosting: {
  title: string;
  company: {
    name: string;
  };
}) {
  return Boolean(jobPosting.title.trim() && jobPosting.company.name.trim());
}

export async function createInterview(formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = interviewFormSchema.parse({
    applicationId: formData.get("applicationId"),
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    locationOrLink: formData.get("locationOrLink"),
    interviewerName: formData.get("interviewerName"),
    interviewerEmail: formData.get("interviewerEmail"),
    prepNotes: formData.get("prepNotes"),
    outcome: formData.get("outcome"),
    feedback: formData.get("feedback"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  await prisma.interview.create({
    data: {
      userId,
      ...parsed,
    },
  });

  revalidatePath("/interviews");
  redirect("/interviews");
}

export async function updateInterview(interviewId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = interviewFormSchema.parse({
    applicationId: formData.get("applicationId"),
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    locationOrLink: formData.get("locationOrLink"),
    interviewerName: formData.get("interviewerName"),
    interviewerEmail: formData.get("interviewerEmail"),
    prepNotes: formData.get("prepNotes"),
    outcome: formData.get("outcome"),
    feedback: formData.get("feedback"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  const result = await prisma.interview.updateMany({
    where: {
      id: interviewId,
      userId,
    },
    data: parsed,
  });

  if (result.count === 0) {
    redirect("/interviews");
  }

  revalidatePath("/interviews");
  revalidatePath(`/interviews/${interviewId}/edit`);
  redirect("/interviews");
}

export async function generateInterviewPrepNotes(interviewId: string) {
  const userId = await getSignedInUserId();
  const editPath = `/interviews/${interviewId}/edit`;

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      userId,
    },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      durationMinutes: true,
      locationOrLink: true,
      interviewerName: true,
      interviewerEmail: true,
      outcome: true,
      feedback: true,
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
          id: true,
          userId: true,
          resumeId: true,
          status: true,
          priority: true,
          appliedAt: true,
          nextActionDate: true,
          notes: true,
          resume: {
            select: {
              userId: true,
              name: true,
              content: true,
            },
          },
          jobPosting: {
            select: {
              userId: true,
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
                  userId: true,
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

  if (!interview) {
    redirect("/interviews");
  }

  if (interview.application.userId !== userId) {
    redirect(`${editPath}?error=missing-application-context`);
  }

  const { application } = interview;
  const { jobPosting } = application;

  if (
    jobPosting.userId !== userId ||
    jobPosting.company.userId !== userId ||
    !hasEnoughJobContext(jobPosting)
  ) {
    redirect(`${editPath}?error=missing-job-context`);
  }

  const resumeContent = application.resume?.content.trim();
  const resumeContext =
    application.resume &&
    application.resume.userId === userId &&
    resumeContent
      ? {
          name: application.resume.name,
          content: resumeContent,
        }
      : null;
  const matchAnalysis = jobPosting.matchAnalysis?.trim();
  const savedJobMatchContext =
    application.resumeId &&
    jobPosting.matchResumeId === application.resumeId &&
    matchAnalysis
      ? {
          score: jobPosting.matchScore,
          analysis: matchAnalysis,
        }
      : null;

  let prepNotes: string;

  try {
    prepNotes = await generateInterviewPrepNotesWithAi({
      careerContext: {
        targetRole: interview.user.targetRole,
        currentRole: interview.user.currentRole,
        targetLocations: interview.user.targetLocations,
        yearsOfExperience: interview.user.yearsOfExperience,
        preferredWorkMode: interview.user.preferredWorkMode,
      },
      interviewContext: {
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        durationMinutes: interview.durationMinutes,
        locationOrLink: interview.locationOrLink,
        interviewerName: interview.interviewerName,
        interviewerEmail: interview.interviewerEmail,
        outcome: interview.outcome,
        feedback: interview.feedback,
      },
      applicationContext: {
        status: application.status,
        priority: application.priority,
        appliedAt: application.appliedAt,
        nextActionDate: application.nextActionDate,
        notes: application.notes,
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
      resumeContext,
      savedJobMatchContext,
    });
  } catch {
    redirect(`${editPath}?error=ai-prep-failed`);
  }

  if (!prepNotes.trim()) {
    redirect(`${editPath}?error=empty-ai-prep`);
  }

  const result = await prisma.interview.updateMany({
    where: {
      id: interviewId,
      userId,
    },
    data: {
      prepNotes,
    },
  });

  if (result.count === 0) {
    redirect("/interviews");
  }

  revalidatePath("/interviews");
  revalidatePath(editPath);
  redirect(`${editPath}?ai=prep-generated`);
}

export async function deleteInterview(interviewId: string) {
  const userId = await getSignedInUserId();

  await prisma.interview.deleteMany({
    where: {
      id: interviewId,
      userId,
    },
  });

  revalidatePath("/interviews");
  redirect("/interviews");
}
