import {
  formatJobPostingEmbeddingText,
  formatResumeEmbeddingText,
  generateEmbedding,
  hashEmbeddingText,
  validateEmbeddingVector,
} from "@/lib/ai/embeddings";
import { prisma } from "@/lib/prisma";
import { Prisma, type WorkMode } from "@/generated/prisma";

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

type CurrentEmbeddingPresenceRow = {
  hasCurrentEmbedding: boolean;
};

type CandidateEmbeddingPresenceRow = {
  hasCandidateEmbeddings: boolean;
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

type SemanticJobPostingSearchCountRow = {
  totalCount: unknown;
  hasEmbeddedJobPostings: boolean;
};

type SemanticResumeSearchCountRow = {
  totalCount: unknown;
  hasEmbeddedResumes: boolean;
};

type SemanticJobPostingSearchRow = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  workMode: WorkMode | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  matchScore: number | null;
  deadline: Date | null;
  savedAt: Date;
  aiSummary: string | null;
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  distance: unknown;
  similarity: unknown;
};

type SemanticResumeSearchRow = {
  id: string;
  name: string;
  content: string;
  fileUrl: string | null;
  aiFeedbackAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

export type ResumeSemanticSearchStatus = {
  sourceResumeHasCurrentEmbedding: boolean;
  jobPostingEmbeddingsExist: boolean;
};

export type JobPostingSemanticSearchStatus = {
  sourceJobPostingHasCurrentEmbedding: boolean;
  resumeEmbeddingsExist: boolean;
};

export type SearchJobPostingsBySemanticQueryInput = {
  userId: string;
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    workMode?: WorkMode;
    companyId?: string;
  };
};

export type SearchJobPostingsBySemanticQueryResult = {
  jobPostings: Array<{
    id: string;
    title: string;
    description: string;
    location: string | null;
    workMode: WorkMode | null;
    seniorityLevel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    matchScore: number | null;
    deadline: Date | null;
    savedAt: Date;
    aiSummary: string | null;
    company: {
      id: string;
      name: string;
      industry: string | null;
    };
    distance: number;
    similarity: number;
  }>;
  totalCount: number;
  hasEmbeddedJobPostings: boolean;
};

export type SearchResumesBySemanticQueryInput = {
  userId: string;
  query: string;
  limit?: number;
  offset?: number;
};

export type SearchResumesBySemanticQueryResult = {
  resumes: Array<{
    id: string;
    name: string;
    content: string;
    fileUrl: string | null;
    aiFeedbackAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    distance: number;
    similarity: number;
  }>;
  totalCount: number;
  hasEmbeddedResumes: boolean;
};

function boundedLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return DEFAULT_SIMILARITY_LIMIT;
  }

  return Math.min(MAX_SIMILARITY_LIMIT, Math.max(1, Math.trunc(limit)));
}

function boundedOffset(offset: number | undefined) {
  if (offset === undefined || !Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(0, Math.trunc(offset));
}

function toNumber(value: unknown) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(numericValue)) {
    throw new Error("Similarity query returned a non-finite score.");
  }

  return numericValue;
}

function toCount(value: unknown) {
  const numericValue =
    typeof value === "bigint" ? Number(value) : Number.parseInt(String(value), 10);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error("Semantic search count query returned an invalid count.");
  }

  return numericValue;
}

function serializeVectorForPg(vector: number[]) {
  return `[${validateEmbeddingVector(vector).join(",")}]`;
}

function buildJobPostingSemanticFilterSql(
  userId: string,
  filters: SearchJobPostingsBySemanticQueryInput["filters"],
) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`jp."userId" = ${userId}`,
    Prisma.sql`jp."embedding" IS NOT NULL`,
    Prisma.sql`jp."embeddingTextHash" IS NOT NULL`,
    Prisma.sql`c."userId" = ${userId}`,
  ];

  if (filters?.workMode) {
    conditions.push(Prisma.sql`jp."workMode" = ${filters.workMode}::"WorkMode"`);
  }

  if (filters?.companyId) {
    conditions.push(Prisma.sql`jp."companyId" = ${filters.companyId}`);
  }

  return Prisma.join(conditions, " AND ");
}

function buildResumeSemanticFilterSql(userId: string) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`r."userId" = ${userId}`,
    Prisma.sql`r."embedding" IS NOT NULL`,
    Prisma.sql`r."embeddingTextHash" IS NOT NULL`,
  ];

  return Prisma.join(conditions, " AND ");
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

export async function getResumeSemanticSearchStatus(
  userId: string,
  resumeId: string,
): Promise<ResumeSemanticSearchStatus> {
  const [sourceRows, candidateRows] = await Promise.all([
    prisma.$queryRaw<CurrentEmbeddingPresenceRow[]>`
      SELECT ("embedding" IS NOT NULL AND "embeddingTextHash" IS NOT NULL) AS "hasCurrentEmbedding"
      FROM "Resume"
      WHERE "id" = ${resumeId}
        AND "userId" = ${userId}
      LIMIT 1
    `,
    prisma.$queryRaw<CandidateEmbeddingPresenceRow[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "JobPosting"
        WHERE "userId" = ${userId}
          AND "embedding" IS NOT NULL
          AND "embeddingTextHash" IS NOT NULL
      ) AS "hasCandidateEmbeddings"
    `,
  ]);

  return {
    sourceResumeHasCurrentEmbedding:
      sourceRows[0]?.hasCurrentEmbedding ?? false,
    jobPostingEmbeddingsExist:
      candidateRows[0]?.hasCandidateEmbeddings ?? false,
  };
}

export async function getJobPostingSemanticSearchStatus(
  userId: string,
  jobPostingId: string,
): Promise<JobPostingSemanticSearchStatus> {
  const [sourceRows, candidateRows] = await Promise.all([
    prisma.$queryRaw<CurrentEmbeddingPresenceRow[]>`
      SELECT ("embedding" IS NOT NULL AND "embeddingTextHash" IS NOT NULL) AS "hasCurrentEmbedding"
      FROM "JobPosting"
      WHERE "id" = ${jobPostingId}
        AND "userId" = ${userId}
      LIMIT 1
    `,
    prisma.$queryRaw<CandidateEmbeddingPresenceRow[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "Resume"
        WHERE "userId" = ${userId}
          AND "embedding" IS NOT NULL
          AND "embeddingTextHash" IS NOT NULL
      ) AS "hasCandidateEmbeddings"
    `,
  ]);

  return {
    sourceJobPostingHasCurrentEmbedding:
      sourceRows[0]?.hasCurrentEmbedding ?? false,
    resumeEmbeddingsExist: candidateRows[0]?.hasCandidateEmbeddings ?? false,
  };
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

export async function searchResumesBySemanticQuery({
  userId,
  query,
  limit,
  offset,
}: SearchResumesBySemanticQueryInput): Promise<SearchResumesBySemanticQueryResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error("Semantic search query must not be empty.");
  }

  const safeLimit = boundedLimit(limit);
  const safeOffset = boundedOffset(offset);
  const whereSql = buildResumeSemanticFilterSql(userId);

  const countRows = await prisma.$queryRaw<SemanticResumeSearchCountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS "totalCount",
             COUNT(*) > 0 AS "hasEmbeddedResumes"
      FROM "Resume" r
      WHERE ${whereSql}
    `,
  );

  const totalCount = toCount(countRows[0]?.totalCount ?? 0);
  const hasEmbeddedResumes = countRows[0]?.hasEmbeddedResumes ?? false;

  if (!hasEmbeddedResumes) {
    return {
      resumes: [],
      totalCount,
      hasEmbeddedResumes,
    };
  }

  const queryEmbedding = await generateEmbedding(trimmedQuery);
  const serializedQueryEmbedding = serializeVectorForPg(queryEmbedding);

  const rows = await prisma.$queryRaw<SemanticResumeSearchRow[]>(
    Prisma.sql`
      SELECT r."id",
             r."name",
             r."content",
             r."fileUrl",
             r."aiFeedbackAt",
             r."createdAt",
             r."updatedAt",
             r."embedding" <=> ${serializedQueryEmbedding}::vector AS "distance",
             1 - (r."embedding" <=> ${serializedQueryEmbedding}::vector) AS "similarity"
      FROM "Resume" r
      WHERE ${whereSql}
      ORDER BY r."embedding" <=> ${serializedQueryEmbedding}::vector ASC,
               r."updatedAt" DESC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `,
  );

  return {
    resumes: rows.map((row) => ({
      id: row.id,
      name: row.name,
      content: row.content,
      fileUrl: row.fileUrl,
      aiFeedbackAt: row.aiFeedbackAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      distance: toNumber(row.distance),
      similarity: toNumber(row.similarity),
    })),
    totalCount,
    hasEmbeddedResumes,
  };
}

export async function searchJobPostingsBySemanticQuery({
  userId,
  query,
  limit,
  offset,
  filters,
}: SearchJobPostingsBySemanticQueryInput): Promise<SearchJobPostingsBySemanticQueryResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error("Semantic search query must not be empty.");
  }

  const safeLimit = boundedLimit(limit);
  const safeOffset = boundedOffset(offset);
  const whereSql = buildJobPostingSemanticFilterSql(userId, filters);

  const countRows = await prisma.$queryRaw<SemanticJobPostingSearchCountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS "totalCount",
             COUNT(*) > 0 AS "hasEmbeddedJobPostings"
      FROM "JobPosting" jp
      JOIN "Company" c
        ON c."id" = jp."companyId"
       AND c."userId" = jp."userId"
      WHERE ${whereSql}
    `,
  );

  const totalCount = toCount(countRows[0]?.totalCount ?? 0);
  const hasEmbeddedJobPostings =
    countRows[0]?.hasEmbeddedJobPostings ?? false;

  if (!hasEmbeddedJobPostings) {
    return {
      jobPostings: [],
      totalCount,
      hasEmbeddedJobPostings,
    };
  }

  const queryEmbedding = await generateEmbedding(trimmedQuery);
  const serializedQueryEmbedding = serializeVectorForPg(queryEmbedding);

  const rows = await prisma.$queryRaw<SemanticJobPostingSearchRow[]>(
    Prisma.sql`
      SELECT jp."id",
             jp."title",
             jp."description",
             jp."location",
             jp."workMode",
             jp."seniorityLevel",
             jp."salaryMin",
             jp."salaryMax",
             jp."salaryCurrency",
             jp."matchScore",
             jp."deadline",
             jp."savedAt",
             jp."aiSummary",
             c."id" AS "companyId",
             c."name" AS "companyName",
             c."industry" AS "companyIndustry",
             jp."embedding" <=> ${serializedQueryEmbedding}::vector AS "distance",
             1 - (jp."embedding" <=> ${serializedQueryEmbedding}::vector) AS "similarity"
      FROM "JobPosting" jp
      JOIN "Company" c
        ON c."id" = jp."companyId"
       AND c."userId" = jp."userId"
      WHERE ${whereSql}
      ORDER BY jp."embedding" <=> ${serializedQueryEmbedding}::vector ASC,
               jp."savedAt" DESC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `,
  );

  return {
    jobPostings: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      workMode: row.workMode,
      seniorityLevel: row.seniorityLevel,
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      salaryCurrency: row.salaryCurrency,
      matchScore: row.matchScore,
      deadline: row.deadline,
      savedAt: row.savedAt,
      aiSummary: row.aiSummary,
      company: {
        id: row.companyId,
        name: row.companyName,
        industry: row.companyIndustry,
      },
      distance: toNumber(row.distance),
      similarity: toNumber(row.similarity),
    })),
    totalCount,
    hasEmbeddedJobPostings,
  };
}
