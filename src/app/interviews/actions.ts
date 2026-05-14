"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
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
