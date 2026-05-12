"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Priority, TaskStatus } from "@/generated/prisma";

const allowedStatuses = ["PENDING", "DONE", "CANCELLED"] as const;
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

  if (!allowedStatuses.includes(value as TaskStatus)) {
    throw new Error("Invalid task status.");
  }

  return value as TaskStatus;
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

async function verifyApplicationOwnership(
  applicationId: string | null,
  userId: string,
) {
  if (applicationId === null) {
    return;
  }

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

function getCompletedAt(status: TaskStatus) {
  return status === "DONE" ? new Date() : null;
}

export async function createTask(formData: FormData) {
  const userId = await getSignedInUserId();

  const applicationId = getNullableString(formData, "applicationId");

  await verifyApplicationOwnership(applicationId, userId);

  const title = getRequiredString(formData, "title", "Task title is required.");
  const status = getStatus(formData);

  await prisma.task.create({
    data: {
      userId,
      applicationId,
      title,
      description: getNullableString(formData, "description"),
      dueAt: getNullableDate(formData, "dueAt"),
      status,
      priority: getPriority(formData),
      completedAt: getCompletedAt(status),
      completionNotes: getNullableString(formData, "completionNotes"),
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(taskId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const applicationId = getNullableString(formData, "applicationId");

  await verifyApplicationOwnership(applicationId, userId);

  const title = getRequiredString(formData, "title", "Task title is required.");
  const status = getStatus(formData);

  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId,
    },
    data: {
      applicationId,
      title,
      description: getNullableString(formData, "description"),
      dueAt: getNullableDate(formData, "dueAt"),
      status,
      priority: getPriority(formData),
      completedAt: getCompletedAt(status),
      completionNotes: getNullableString(formData, "completionNotes"),
    },
  });

  if (result.count === 0) {
    redirect("/tasks");
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}/edit`);
  redirect("/tasks");
}

export async function deleteTask(taskId: string) {
  const userId = await getSignedInUserId();

  await prisma.task.deleteMany({
    where: {
      id: taskId,
      userId,
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}
