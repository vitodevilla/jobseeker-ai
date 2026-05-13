"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InterviewOutcome, InterviewType } from "@/generated/prisma";

const allowedInterviewTypes = [
  "PHONE_SCREEN",
  "TECHNICAL",
  "BEHAVIORAL",
  "SYSTEM_DESIGN",
  "CASE_STUDY",
  "IN_PERSON",
  "FINAL",
] as const;

const allowedOutcomes = [
  "PENDING",
  "PASSED",
  "FAILED",
  "CANCELLED",
  "NO_SHOW",
] as const;

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

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a valid positive number.`);
  }

  return parsed;
}

function getRequiredDateTime(formData: FormData, key: string, message: string) {
  const value = getRequiredString(formData, key, message);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(message);
  }

  return date;
}

function getInterviewType(formData: FormData) {
  const value = getRequiredString(
    formData,
    "type",
    "Interview type is required.",
  );

  if (!allowedInterviewTypes.includes(value as InterviewType)) {
    throw new Error("Invalid interview type.");
  }

  return value as InterviewType;
}

function getOutcome(formData: FormData) {
  const value = getRequiredString(formData, "outcome", "Outcome is required.");

  if (!allowedOutcomes.includes(value as InterviewOutcome)) {
    throw new Error("Invalid interview outcome.");
  }

  return value as InterviewOutcome;
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

export async function createInterview(formData: FormData) {
  const userId = await getSignedInUserId();

  const applicationId = getRequiredString(
    formData,
    "applicationId",
    "Application is required.",
  );

  await verifyApplicationOwnership(applicationId, userId);

  await prisma.interview.create({
    data: {
      userId,
      applicationId,
      type: getInterviewType(formData),
      scheduledAt: getRequiredDateTime(
        formData,
        "scheduledAt",
        "Scheduled date and time are required.",
      ),
      durationMinutes: getNullableInt(formData, "durationMinutes"),
      locationOrLink: getNullableString(formData, "locationOrLink"),
      interviewerName: getNullableString(formData, "interviewerName"),
      interviewerEmail: getNullableString(formData, "interviewerEmail"),
      prepNotes: getNullableString(formData, "prepNotes"),
      outcome: getOutcome(formData),
      feedback: getNullableString(formData, "feedback"),
    },
  });

  revalidatePath("/interviews");
  redirect("/interviews");
}

export async function updateInterview(interviewId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const applicationId = getRequiredString(
    formData,
    "applicationId",
    "Application is required.",
  );

  await verifyApplicationOwnership(applicationId, userId);

  const result = await prisma.interview.updateMany({
    where: {
      id: interviewId,
      userId,
    },
    data: {
      applicationId,
      type: getInterviewType(formData),
      scheduledAt: getRequiredDateTime(
        formData,
        "scheduledAt",
        "Scheduled date and time are required.",
      ),
      durationMinutes: getNullableInt(formData, "durationMinutes"),
      locationOrLink: getNullableString(formData, "locationOrLink"),
      interviewerName: getNullableString(formData, "interviewerName"),
      interviewerEmail: getNullableString(formData, "interviewerEmail"),
      prepNotes: getNullableString(formData, "prepNotes"),
      outcome: getOutcome(formData),
      feedback: getNullableString(formData, "feedback"),
    },
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
