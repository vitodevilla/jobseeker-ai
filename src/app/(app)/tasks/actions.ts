"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@/generated/prisma";
import { taskFormSchema } from "@/lib/validations/task";

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

  const parsed = taskFormSchema.parse({
    applicationId: formData.get("applicationId"),
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    completionNotes: formData.get("completionNotes"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  await prisma.task.create({
    data: {
      userId,
      ...parsed,
      completedAt: getCompletedAt(parsed.status),
    },
  });

  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(taskId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = taskFormSchema.parse({
    applicationId: formData.get("applicationId"),
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    completionNotes: formData.get("completionNotes"),
  });

  await verifyApplicationOwnership(parsed.applicationId, userId);

  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId,
    },
    data: {
      ...parsed,
      completedAt: getCompletedAt(parsed.status),
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
