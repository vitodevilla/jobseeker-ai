"use server";

import { put } from "@vercel/blob";
import pdfParse from "pdf-parse/lib/pdf-parse";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { generateResumeCritique } from "@/lib/ai/resume-critique";
import { prisma } from "@/lib/prisma";
import { generateResumeEmbeddingForUser } from "@/lib/retrieval/semantic-search";
import { resumeFormSchema } from "@/lib/validations/resume";

const MAX_RESUME_PDF_SIZE_BYTES = 5 * 1024 * 1024;

type ResumePdfFileResult =
  | {
      status: "ok";
      file: File;
    }
  | {
      status: "empty";
    }
  | {
      status: "invalid-file-type";
    }
  | {
      status: "file-too-large";
    };

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
    return {
      status: "empty",
    } satisfies ResumePdfFileResult;
  }

  if (file.type !== "application/pdf") {
    return {
      status: "invalid-file-type",
    } satisfies ResumePdfFileResult;
  }

  if (file.size > MAX_RESUME_PDF_SIZE_BYTES) {
    return {
      status: "file-too-large",
    } satisfies ResumePdfFileResult;
  }

  return {
    status: "ok",
    file,
  } satisfies ResumePdfFileResult;
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

async function extractTextFromPdfOrRedirect(file: File, errorPath: string) {
  try {
    return await extractTextFromPdf(file);
  } catch {
    redirect(`${errorPath}?error=pdf-extraction-failed`);
  }
}

function redirectIfKnownPdfFileError(
  result: ResumePdfFileResult,
  errorPath: string,
) {
  if (result.status === "invalid-file-type") {
    redirect(`${errorPath}?error=invalid-file-type`);
  }

  if (result.status === "file-too-large") {
    redirect(`${errorPath}?error=file-too-large`);
  }
}

function revalidateResumeSemanticDataPaths(resumeId: string) {
  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resumeId}/edit`);
  revalidatePath("/job-postings");
  revalidatePath("/job-postings/[jobPostingId]/edit", "page");
}

export async function createResume(formData: FormData) {
  const userId = await getSignedInUserId();

  const parsed = resumeFormSchema.parse({
    name: formData.get("name"),
    content: formData.get("content"),
  });

  const pdfFile = getOptionalPdfFile(formData);
  redirectIfKnownPdfFileError(pdfFile, "/resumes/new");

  let fileUrl: string | null = null;
  let extractedContent: string | null = null;

  if (pdfFile.status === "ok") {
    const extractedText = await extractTextFromPdfOrRedirect(
      pdfFile.file,
      "/resumes/new",
    );
    const blob = await uploadResumePdf(pdfFile.file, userId);

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
  const editPath = `/resumes/${resumeId}/edit`;
  redirectIfKnownPdfFileError(pdfFile, editPath);

  let finalContent = parsed.content;
  let fileUrl: string | undefined;

  if (pdfFile.status === "ok") {
    const extractedText = await extractTextFromPdfOrRedirect(
      pdfFile.file,
      editPath,
    );
    finalContent = extractedText || parsed.content;
  }

  if (!finalContent) {
    redirect(`${editPath}?error=missing-content`);
  }

  if (pdfFile.status === "ok") {
    const blob = await uploadResumePdf(pdfFile.file, userId);
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

export async function refreshResumeSemanticData(resumeId: string) {
  const userId = await getSignedInUserId();
  const editPath = `/resumes/${resumeId}/edit`;

  let result: Awaited<ReturnType<typeof generateResumeEmbeddingForUser>> | null =
    null;

  try {
    result = await generateResumeEmbeddingForUser(userId, resumeId);
  } catch {
    revalidateResumeSemanticDataPaths(resumeId);
    redirect(`${editPath}?error=semantic-failed`);
  }

  if (!result || result.status === "not_found") {
    redirect("/resumes");
  }

  revalidateResumeSemanticDataPaths(resumeId);

  if (result.status === "updated") {
    redirect(`${editPath}?semantic=updated`);
  }

  if (result.status === "skipped_fresh") {
    redirect(`${editPath}?semantic=fresh`);
  }

  redirect(`${editPath}?error=semantic-empty`);
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
