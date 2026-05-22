"use server";

import { put } from "@vercel/blob";
import pdfParse from "pdf-parse/lib/pdf-parse";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateResumeCritique } from "@/lib/ai/resume-critique";
import { prisma } from "@/lib/prisma";
import { resumeFormSchema } from "@/lib/validations/resume";

const MAX_RESUME_PDF_SIZE_BYTES = 5 * 1024 * 1024;

async function getSignedInUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session.user.id;
}

function getOptionalPdfFile(formData: FormData) {
  const file = formData.get("pdfFile");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.type !== "application/pdf") {
    throw new Error("Resume file must be a PDF.");
  }

  if (file.size > MAX_RESUME_PDF_SIZE_BYTES) {
    throw new Error("Resume PDF must be 5 MB or smaller.");
  }

  return file;
}

async function extractTextFromPdf(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await pdfParse(buffer);
  return result.text.trim();
}

async function uploadResumePdf(file: File, userId: string) {
  const safeFileName = file.name.replaceAll(/[^a-zA-Z0-9.\-_]/g, "-");

  return put(`resumes/${userId}/${Date.now()}-${safeFileName}`, file, {
    access: "private",
    addRandomSuffix: true,
  });
}

export async function createResume(formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = resumeFormSchema.parse({
    name: formData.get("name"),
    content: formData.get("content"),
  });

  const pdfFile = getOptionalPdfFile(formData);

  let fileUrl: string | null = null;
  let extractedContent: string | null = null;

  if (pdfFile) {
    const [blob, extractedText] = await Promise.all([
      uploadResumePdf(pdfFile, userId),
      extractTextFromPdf(pdfFile),
    ]);

    fileUrl = blob.url;
    extractedContent = extractedText || null;
  }

  const finalContent = extractedContent ?? parsed.content;

  if (!finalContent) {
    redirect("/resumes/new?error=missing-content");
  }

  await prisma.resume.create({
    data: {
      userId,
      name: parsed.name,
      content: finalContent,
      fileUrl,
    },
  });

  revalidatePath("/resumes");
  redirect("/resumes");
}

export async function updateResume(resumeId: string, formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = resumeFormSchema.parse({
    name: formData.get("name"),
    content: formData.get("content"),
  });

  const pdfFile = getOptionalPdfFile(formData);

  let finalContent = parsed.content;
  let fileUrl: string | undefined;

  if (pdfFile) {
    const extractedText = await extractTextFromPdf(pdfFile);
    finalContent = extractedText || parsed.content;
  }

  if (!finalContent) {
    redirect(`/resumes/${resumeId}/edit?error=missing-content`);
  }

  if (pdfFile) {
    const blob = await uploadResumePdf(pdfFile, userId);
    fileUrl = blob.url;
  }

  const result = await prisma.resume.updateMany({
    where: {
      id: resumeId,
      userId,
    },
    data: {
      name: parsed.name,
      content: finalContent,
      embeddedAt: null,
      embeddingTextHash: null,
      ...(fileUrl ? { fileUrl } : {}),
    },
  });

  if (result.count === 0) {
    redirect("/resumes");
  }

  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resumeId}/edit`);
  redirect("/resumes");
}

export async function generateResumeAiFeedback(resumeId: string) {
  const userId = await getSignedInUserId();

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
    select: {
      name: true,
      content: true,
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

  if (!resume) {
    redirect("/resumes");
  }

  if (!resume.content.trim()) {
    redirect(`/resumes/${resumeId}/edit?error=missing-content`);
  }

  let aiFeedback: string;

  try {
    aiFeedback = await generateResumeCritique({
      resumeName: resume.name,
      resumeContent: resume.content,
      careerContext: {
        targetRole: resume.user.targetRole,
        currentRole: resume.user.currentRole,
        targetLocations: resume.user.targetLocations,
        yearsOfExperience: resume.user.yearsOfExperience,
        preferredWorkMode: resume.user.preferredWorkMode,
      },
    });
  } catch {
    redirect(`/resumes/${resumeId}/edit?error=ai-failed`);
  }

  if (!aiFeedback) {
    redirect(`/resumes/${resumeId}/edit?error=empty-ai-feedback`);
  }

  const result = await prisma.resume.updateMany({
    where: {
      id: resumeId,
      userId,
    },
    data: {
      aiFeedback,
      aiFeedbackAt: new Date(),
    },
  });

  if (result.count === 0) {
    redirect("/resumes");
  }

  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resumeId}/edit`);
  redirect(`/resumes/${resumeId}/edit?ai=generated`);
}

export async function deleteResume(resumeId: string) {
  const userId = await getSignedInUserId();

  await prisma.resume.deleteMany({
    where: {
      id: resumeId,
      userId,
    },
  });

  revalidatePath("/resumes");
  redirect("/resumes");
}
