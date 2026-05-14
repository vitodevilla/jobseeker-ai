"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coverLetterFormSchema } from "@/lib/validations/cover-letter";

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

  const parsed = coverLetterFormSchema.parse({
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
