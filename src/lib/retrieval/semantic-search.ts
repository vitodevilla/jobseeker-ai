import {
  formatJobPostingEmbeddingText,
  formatResumeEmbeddingText,
  generateEmbedding,
  hashEmbeddingText,
  validateEmbeddingVector,
} from "@/lib/ai/embeddings";
import { prisma } from "@/lib/prisma";

const DEFAULT_SIMILARITY_LIMIT = 5;
const MAX_SIMILARITY_LIMIT = 20;

type EmbeddingRecordType = "resume" | "jobPosting";

export type EmbeddingGenerationResult = {
  recordType: EmbeddingRecordType;
  id: string;
  status: "not_found" | "skipped_empty" | "skipped_fresh" | "updated";
  embeddingTextHash?: string;
  embeddedAt?: Date;
};

type EmbeddingPresenceRow = {
  hasEmbedding: boolean;
};

type SimilarJobPostingRow = {
  id: string;
  title: string;
  companyName: string;
  distance: unknown;
  similarity: unknown;
};

type SimilarResumeRow = {
  id: string;
  name: string;
  distance: unknown;
  similarity: unknown;
};

export type SimilarJobPostingResult = {
  id: string;
  title: string;
  companyName: string;
  distance: number;
  similarity: number;
};

export type SimilarResumeResult = {
  id: string;
  name: string;
  distance: number;
  similarity: number;
};

function boundedLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_SIMILARITY_LIMIT;
  }

  return Math.min(MAX_SIMILARITY_LIMIT, Math.max(1, Math.trunc(limit)));
}

function toNumber(value: unknown) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(numericValue)) {
    throw new Error("Similarity query returned a non-finite score.");
  }

  return numericValue;
}

function serializeVectorForPg(vector: number[]) {
  return `[${validateEmbeddingVector(vector).join(",")}]`;
}

async function resumeHasEmbedding(userId: string, resumeId: string) {
  const rows = await prisma.$queryRaw<EmbeddingPresenceRow[]>`
    SELECT "embedding" IS NOT NULL AS "hasEmbedding"
    FROM "Resume"
    WHERE "id" = ${resumeId}
      AND "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0]?.hasEmbedding ?? false;
}

async function jobPostingHasEmbedding(
  userId: string,
  jobPostingId: string,
) {
  const rows = await prisma.$queryRaw<EmbeddingPresenceRow[]>`
    SELECT "embedding" IS NOT NULL AS "hasEmbedding"
    FROM "JobPosting"
    WHERE "id" = ${jobPostingId}
      AND "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0]?.hasEmbedding ?? false;
}

async function clearResumeEmbeddingMetadata(
  userId: string,
  resumeId: string,
) {
  await prisma.resume.updateMany({
    where: {
      id: resumeId,
      userId,
    },
    data: {
      embeddedAt: null,
      embeddingTextHash: null,
    },
  });
}

async function clearJobPostingEmbeddingMetadata(
  userId: string,
  jobPostingId: string,
) {
  await prisma.jobPosting.updateMany({
    where: {
      id: jobPostingId,
      userId,
    },
    data: {
      embeddedAt: null,
      embeddingTextHash: null,
    },
  });
}

async function updateResumeEmbedding(
  userId: string,
  resumeId: string,
  embedding: number[],
  embeddingTextHash: string,
  embeddedAt: Date,
) {
  const serializedEmbedding = serializeVectorForPg(embedding);

  return prisma.$executeRaw`
    UPDATE "Resume"
    SET "embedding" = ${serializedEmbedding}::vector,
        "embeddedAt" = ${embeddedAt},
        "embeddingTextHash" = ${embeddingTextHash}
    WHERE "id" = ${resumeId}
      AND "userId" = ${userId}
  `;
}

async function updateJobPostingEmbedding(
  userId: string,
  jobPostingId: string,
  embedding: number[],
  embeddingTextHash: string,
  embeddedAt: Date,
) {
  const serializedEmbedding = serializeVectorForPg(embedding);

  return prisma.$executeRaw`
    UPDATE "JobPosting"
    SET "embedding" = ${serializedEmbedding}::vector,
        "embeddedAt" = ${embeddedAt},
        "embeddingTextHash" = ${embeddingTextHash}
    WHERE "id" = ${jobPostingId}
      AND "userId" = ${userId}
  `;
}

export async function generateResumeEmbeddingForUser(
  userId: string,
  resumeId: string,
): Promise<EmbeddingGenerationResult> {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId,
    },
    select: {
      id: true,
      name: true,
      content: true,
      embeddingTextHash: true,
    },
  });

  if (!resume) {
    return {
      recordType: "resume",
      id: resumeId,
      status: "not_found",
    };
  }

  if (!resume.content.trim()) {
    await clearResumeEmbeddingMetadata(userId, resume.id);
    return {
      recordType: "resume",
      id: resume.id,
      status: "skipped_empty",
    };
  }

  const embeddingText = formatResumeEmbeddingText(resume);

  if (!embeddingText) {
    await clearResumeEmbeddingMetadata(userId, resume.id);
    return {
      recordType: "resume",
      id: resume.id,
      status: "skipped_empty",
    };
  }

  const embeddingTextHash = hashEmbeddingText(embeddingText);
  const hasEmbedding = await resumeHasEmbedding(userId, resume.id);

  if (resume.embeddingTextHash === embeddingTextHash && hasEmbedding) {
    return {
      recordType: "resume",
      id: resume.id,
      status: "skipped_fresh",
      embeddingTextHash,
    };
  }

  const embedding = await generateEmbedding(embeddingText);
  const embeddedAt = new Date();
  const updateCount = await updateResumeEmbedding(
    userId,
    resume.id,
    embedding,
    embeddingTextHash,
    embeddedAt,
  );

  if (updateCount === 0) {
    return {
      recordType: "resume",
      id: resume.id,
      status: "not_found",
    };
  }

  return {
    recordType: "resume",
    id: resume.id,
    status: "updated",
    embeddingTextHash,
    embeddedAt,
  };
}

export async function generateJobPostingEmbeddingForUser(
  userId: string,
  jobPostingId: string,
): Promise<EmbeddingGenerationResult> {
  const jobPosting = await prisma.jobPosting.findFirst({
    where: {
      id: jobPostingId,
      userId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      workMode: true,
      seniorityLevel: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      embeddingTextHash: true,
      company: {
        select: {
          name: true,
          industry: true,
          notes: true,
        },
      },
    },
  });

  if (!jobPosting) {
    return {
      recordType: "jobPosting",
      id: jobPostingId,
      status: "not_found",
    };
  }

  const titleText = jobPosting.title.trim();
  const descriptionText = jobPosting.description?.trim() ?? "";

  if (!titleText && !descriptionText) {
    await clearJobPostingEmbeddingMetadata(userId, jobPosting.id);
    return {
      recordType: "jobPosting",
      id: jobPosting.id,
      status: "skipped_empty",
    };
  }

  const embeddingText = formatJobPostingEmbeddingText(jobPosting);

  if (!embeddingText) {
    await clearJobPostingEmbeddingMetadata(userId, jobPosting.id);
    return {
      recordType: "jobPosting",
      id: jobPosting.id,
      status: "skipped_empty",
    };
  }

  const embeddingTextHash = hashEmbeddingText(embeddingText);
  const hasEmbedding = await jobPostingHasEmbedding(userId, jobPosting.id);

  if (jobPosting.embeddingTextHash === embeddingTextHash && hasEmbedding) {
    return {
      recordType: "jobPosting",
      id: jobPosting.id,
      status: "skipped_fresh",
      embeddingTextHash,
    };
  }

  const embedding = await generateEmbedding(embeddingText);
  const embeddedAt = new Date();
  const updateCount = await updateJobPostingEmbedding(
    userId,
    jobPosting.id,
    embedding,
    embeddingTextHash,
    embeddedAt,
  );

  if (updateCount === 0) {
    return {
      recordType: "jobPosting",
      id: jobPosting.id,
      status: "not_found",
    };
  }

  return {
    recordType: "jobPosting",
    id: jobPosting.id,
    status: "updated",
    embeddingTextHash,
    embeddedAt,
  };
}

export async function findSimilarJobPostingsToResume(
  userId: string,
  resumeId: string,
  limit?: number,
): Promise<SimilarJobPostingResult[]> {
  const safeLimit = boundedLimit(limit);

  const rows = await prisma.$queryRaw<SimilarJobPostingRow[]>`
    SELECT jp."id",
           jp."title",
           c."name" AS "companyName",
           jp."embedding" <=> source."embedding" AS "distance",
           1 - (jp."embedding" <=> source."embedding") AS "similarity"
    FROM "Resume" source
    JOIN "JobPosting" jp
      ON jp."userId" = source."userId"
    JOIN "Company" c
      ON c."id" = jp."companyId"
     AND c."userId" = source."userId"
    WHERE source."id" = ${resumeId}
      AND source."userId" = ${userId}
      AND source."embedding" IS NOT NULL
      AND source."embeddingTextHash" IS NOT NULL
      AND jp."userId" = ${userId}
      AND jp."embedding" IS NOT NULL
      AND jp."embeddingTextHash" IS NOT NULL
    ORDER BY jp."embedding" <=> source."embedding" ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    companyName: row.companyName,
    distance: toNumber(row.distance),
    similarity: toNumber(row.similarity),
  }));
}

export async function findSimilarResumesToJobPosting(
  userId: string,
  jobPostingId: string,
  limit?: number,
): Promise<SimilarResumeResult[]> {
  const safeLimit = boundedLimit(limit);

  const rows = await prisma.$queryRaw<SimilarResumeRow[]>`
    SELECT resume."id",
           resume."name",
           resume."embedding" <=> source."embedding" AS "distance",
           1 - (resume."embedding" <=> source."embedding") AS "similarity"
    FROM "JobPosting" source
    JOIN "Resume" resume
      ON resume."userId" = source."userId"
    WHERE source."id" = ${jobPostingId}
      AND source."userId" = ${userId}
      AND source."embedding" IS NOT NULL
      AND source."embeddingTextHash" IS NOT NULL
      AND resume."userId" = ${userId}
      AND resume."embedding" IS NOT NULL
      AND resume."embeddingTextHash" IS NOT NULL
    ORDER BY resume."embedding" <=> source."embedding" ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    distance: toNumber(row.distance),
    similarity: toNumber(row.similarity),
  }));
}
