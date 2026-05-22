import { config } from "dotenv";
import type { EmbeddingGenerationResult } from "../src/lib/retrieval/semantic-search";

config({ path: ".env.local" });

type BackfillCounts = {
  scanned: number;
  skippedFresh: number;
  skippedEmpty: number;
  updated: number;
  failed: number;
};

function createCounts(): BackfillCounts {
  return {
    scanned: 0,
    skippedFresh: 0,
    skippedEmpty: 0,
    updated: 0,
    failed: 0,
  };
}

function addCounts(total: BackfillCounts, next: BackfillCounts) {
  total.scanned += next.scanned;
  total.skippedFresh += next.skippedFresh;
  total.skippedEmpty += next.skippedEmpty;
  total.updated += next.updated;
  total.failed += next.failed;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function assertRequiredEnv() {
  const missing = [
    "DATABASE_URL",
    "GOOGLE_GENERATIVE_AI_API_KEY",
  ].filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.`,
    );
  }
}

function applyResult(counts: BackfillCounts, result: EmbeddingGenerationResult) {
  if (result.status === "updated") {
    counts.updated += 1;
    return;
  }

  if (result.status === "skipped_fresh") {
    counts.skippedFresh += 1;
    return;
  }

  if (result.status === "skipped_empty") {
    counts.skippedEmpty += 1;
    return;
  }

  counts.failed += 1;
}

function printCounts(label: string, counts: BackfillCounts) {
  console.log(`${label}:`);
  console.log(`  scanned: ${counts.scanned}`);
  console.log(`  skippedFresh: ${counts.skippedFresh}`);
  console.log(`  skippedEmpty: ${counts.skippedEmpty}`);
  console.log(`  updated: ${counts.updated}`);
  console.log(`  failed: ${counts.failed}`);
}

let disconnectPrisma: (() => Promise<void>) | null = null;

async function main() {
  assertRequiredEnv();

  const { prisma } = await import("../src/lib/prisma");
  const {
    generateJobPostingEmbeddingForUser,
    generateResumeEmbeddingForUser,
  } = await import("../src/lib/retrieval/semantic-search");

  disconnectPrisma = () => prisma.$disconnect();

  const [resumes, jobPostings] = await Promise.all([
    prisma.resume.findMany({
      select: {
        id: true,
        userId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.jobPosting.findMany({
      select: {
        id: true,
        userId: true,
      },
      orderBy: {
        savedAt: "asc",
      },
    }),
  ]);

  const resumeCounts = createCounts();
  const jobPostingCounts = createCounts();

  for (const resume of resumes) {
    resumeCounts.scanned += 1;

    try {
      const result = await generateResumeEmbeddingForUser(
        resume.userId,
        resume.id,
      );
      applyResult(resumeCounts, result);
      console.log(`[resume:${resume.id}] ${result.status}`);
    } catch (error) {
      resumeCounts.failed += 1;
      console.error(`[resume:${resume.id}] failed: ${formatError(error)}`);
    }
  }

  for (const jobPosting of jobPostings) {
    jobPostingCounts.scanned += 1;

    try {
      const result = await generateJobPostingEmbeddingForUser(
        jobPosting.userId,
        jobPosting.id,
      );
      applyResult(jobPostingCounts, result);
      console.log(`[jobPosting:${jobPosting.id}] ${result.status}`);
    } catch (error) {
      jobPostingCounts.failed += 1;
      console.error(
        `[jobPosting:${jobPosting.id}] failed: ${formatError(error)}`,
      );
    }
  }

  const totalCounts = createCounts();
  addCounts(totalCounts, resumeCounts);
  addCounts(totalCounts, jobPostingCounts);

  printCounts("Resumes", resumeCounts);
  printCounts("Job postings", jobPostingCounts);
  printCounts("Total", totalCounts);

  if (totalCounts.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(formatError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma?.();
  });
