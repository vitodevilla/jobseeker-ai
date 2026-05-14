"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumeFormSchema } from "@/lib/validations/resume";

export async function createResume(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const parsed = resumeFormSchema.parse({
    name: formData.get("name"),
    content: formData.get("content"),
  });

  await prisma.resume.create({
    data: {
      userId: session.user.id,
      ...parsed,
    },
  });

  revalidatePath("/resumes");
  redirect("/resumes");
}

export async function updateResume(resumeId: string, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const parsed = resumeFormSchema.parse({
    name: formData.get("name"),
    content: formData.get("content"),
  });

  const result = await prisma.resume.updateMany({
    where: {
      id: resumeId,
      userId: session.user.id,
    },
    data: parsed,
  });

  if (result.count === 0) {
    redirect("/resumes");
  }

  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resumeId}/edit`);
  redirect("/resumes");
}

export async function deleteResume(resumeId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  await prisma.resume.deleteMany({
    where: {
      id: resumeId,
      userId: session.user.id,
    },
  });

  revalidatePath("/resumes");
  redirect("/resumes");
}
