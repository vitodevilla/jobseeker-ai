import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const TOP_N = 5;
const EXPECTED_JOB_POSTING_COUNT = 24;
const EXPECTED_RESUME_COUNT = 12;
const REPORT_PATH = "docs/evaluation-results/retrieval-evaluation-latest.md";

type PrismaClientInstance = Awaited<typeof import("../src/lib/prisma")>["prisma"];

type CliOptions = {
  email: string | null;
  help: boolean;
  writeReport: boolean;
};

type EvaluationSection =
  | "job-query"
  | "resume-query"
  | "resume-to-jobs"
  | "job-to-resumes";

type EvaluationCase = {
  section: EvaluationSection;
  name: string;
  query?: string;
  sourceId?: string;
  expectedStrongIds: string[];
  expectedMediumIds?: string[];
  expectedDecoyIds?: string[];
  notes?: string;
};

type EvaluationResult = EvaluationCase & {
  returnedTopIds: string[];
  top1Hit: boolean;
  top3Hit: boolean;
  top5Hit: boolean;
  strongCountAt5: number;
  bestStrongRank: number | null;
  bestMediumRank: number | null;
  bestDecoyRank: number | null;
  orderingOk: boolean | null;
};

type AggregateSummary = {
  totalCases: number;
  top1PassCount: number;
  top3PassCount: number;
  top5PassCount: number;
  averageStrongCountAt5: number;
};

type DatasetPreflightSummary = {
  jobPostingCount: number;
  resumeCount: number;
  embeddedJobPostingCount: number;
  embeddedResumeCount: number;
};

type OwnershipRow = {
  id: string;
  userId: string;
};

type EmbeddingPresenceRow = {
  id: string;
  hasEmbedding: boolean;
  hasEmbeddingTextHash: boolean;
};

const demoJobPostingIds = [
  "semantic-demo-job-frontend-react",
  "semantic-demo-job-frontend-accessibility",
  "semantic-demo-job-frontend-dashboard",
  "semantic-demo-job-fullstack-next-prisma",
  "semantic-demo-job-fullstack-product-platform",
  "semantic-demo-job-fullstack-saas-integrations",
  "semantic-demo-job-backend-node-api",
  "semantic-demo-job-backend-database-services",
  "semantic-demo-job-backend-payments",
  "semantic-demo-job-data-ai-analyst",
  "semantic-demo-job-data-product-analyst",
  "semantic-demo-job-data-ml-evaluation",
  "semantic-demo-job-devops-cloud-ci",
  "semantic-demo-job-devops-platform-reliability",
  "semantic-demo-job-devops-release-operations",
  "semantic-demo-job-ux-product-designer",
  "semantic-demo-job-ux-researcher",
  "semantic-demo-job-ux-design-systems",
  "semantic-demo-job-peopleops-hr-coordinator",
  "semantic-demo-job-peopleops-talent-analyst",
  "semantic-demo-job-peopleops-psych-research",
  "semantic-demo-job-general-customer-support",
  "semantic-demo-job-general-office-operations",
  "semantic-demo-job-general-content-coordinator",
];

const demoResumeIds = [
  "semantic-demo-resume-junior-frontend",
  "semantic-demo-resume-react-ui",
  "semantic-demo-resume-fullstack-next",
  "semantic-demo-resume-backend-node",
  "semantic-demo-resume-data-ai",
  "semantic-demo-resume-ml-evaluation",
  "semantic-demo-resume-devops-cloud",
  "semantic-demo-resume-ux-product",
  "semantic-demo-resume-hr-peopleops",
  "semantic-demo-resume-psychology-research",
  "semantic-demo-resume-general-admin",
  "semantic-demo-resume-customer-support",
];

const jobQueryCases: EvaluationCase[] = [
  {
    section: "job-query",
    name: "Frontend dashboard components",
    query: "frontend dashboard components",
    expectedStrongIds: [
      "semantic-demo-job-frontend-dashboard",
      "semantic-demo-job-frontend-react",
      "semantic-demo-job-frontend-accessibility",
    ],
    expectedMediumIds: [
      "semantic-demo-job-fullstack-next-prisma",
      "semantic-demo-job-ux-design-systems",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-general-customer-support",
      "semantic-demo-job-general-content-coordinator",
    ],
  },
  {
    section: "job-query",
    name: "People analytics hiring process",
    query: "people analytics hiring process",
    expectedStrongIds: [
      "semantic-demo-job-peopleops-talent-analyst",
      "semantic-demo-job-peopleops-hr-coordinator",
      "semantic-demo-job-peopleops-psych-research",
    ],
    expectedMediumIds: [
      "semantic-demo-job-ux-researcher",
      "semantic-demo-job-data-ai-analyst",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-devops-release-operations",
      "semantic-demo-job-backend-node-api",
    ],
  },
  {
    section: "job-query",
    name: "Cloud deployment pipeline",
    query: "cloud deployment pipeline",
    expectedStrongIds: [
      "semantic-demo-job-devops-cloud-ci",
      "semantic-demo-job-devops-release-operations",
      "semantic-demo-job-devops-platform-reliability",
    ],
    expectedMediumIds: [
      "semantic-demo-job-backend-payments",
      "semantic-demo-job-fullstack-saas-integrations",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-general-office-operations",
      "semantic-demo-job-peopleops-hr-coordinator",
    ],
  },
  {
    section: "job-query",
    name: "Customer support SaaS users",
    query: "customer support SaaS users",
    expectedStrongIds: ["semantic-demo-job-general-customer-support"],
    expectedMediumIds: [
      "semantic-demo-job-general-content-coordinator",
      "semantic-demo-job-general-office-operations",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-fullstack-saas-integrations",
      "semantic-demo-job-frontend-react",
    ],
  },
  {
    section: "job-query",
    name: "Data AI evaluation workflows",
    query: "data AI evaluation workflows",
    expectedStrongIds: [
      "semantic-demo-job-data-ml-evaluation",
      "semantic-demo-job-data-ai-analyst",
      "semantic-demo-job-data-product-analyst",
    ],
    expectedMediumIds: [
      "semantic-demo-job-peopleops-talent-analyst",
      "semantic-demo-job-ux-researcher",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-peopleops-hr-coordinator",
      "semantic-demo-job-general-office-operations",
    ],
  },
];

const resumeQueryCases: EvaluationCase[] = [
  {
    section: "resume-query",
    name: "Frontend React components",
    query: "frontend React components",
    expectedStrongIds: [
      "semantic-demo-resume-junior-frontend",
      "semantic-demo-resume-react-ui",
    ],
    expectedMediumIds: [
      "semantic-demo-resume-fullstack-next",
      "semantic-demo-resume-ux-product",
    ],
    expectedDecoyIds: [
      "semantic-demo-resume-customer-support",
      "semantic-demo-resume-hr-peopleops",
    ],
  },
  {
    section: "resume-query",
    name: "Node APIs database services",
    query: "Node APIs database services",
    expectedStrongIds: [
      "semantic-demo-resume-backend-node",
      "semantic-demo-resume-fullstack-next",
    ],
    expectedMediumIds: ["semantic-demo-resume-devops-cloud"],
    expectedDecoyIds: [
      "semantic-demo-resume-general-admin",
      "semantic-demo-resume-customer-support",
    ],
  },
  {
    section: "resume-query",
    name: "People operations hiring research",
    query: "people operations hiring research",
    expectedStrongIds: [
      "semantic-demo-resume-hr-peopleops",
      "semantic-demo-resume-psychology-research",
    ],
    expectedMediumIds: [
      "semantic-demo-resume-data-ai",
      "semantic-demo-resume-ml-evaluation",
      "semantic-demo-resume-ux-product",
    ],
    expectedDecoyIds: [
      "semantic-demo-resume-devops-cloud",
      "semantic-demo-resume-backend-node",
    ],
  },
  {
    section: "resume-query",
    name: "Cloud deployment pipeline",
    query: "cloud deployment pipeline",
    expectedStrongIds: ["semantic-demo-resume-devops-cloud"],
    expectedMediumIds: [
      "semantic-demo-resume-backend-node",
      "semantic-demo-resume-fullstack-next",
    ],
    expectedDecoyIds: [
      "semantic-demo-resume-general-admin",
      "semantic-demo-resume-hr-peopleops",
    ],
  },
  {
    section: "resume-query",
    name: "Customer support SaaS users",
    query: "customer support SaaS users",
    expectedStrongIds: ["semantic-demo-resume-customer-support"],
    expectedMediumIds: [
      "semantic-demo-resume-general-admin",
      "semantic-demo-resume-fullstack-next",
    ],
    expectedDecoyIds: [
      "semantic-demo-resume-backend-node",
      "semantic-demo-resume-devops-cloud",
    ],
  },
];

const resumeToJobsCases: EvaluationCase[] = [
  {
    section: "resume-to-jobs",
    name: "Junior frontend resume to jobs",
    sourceId: "semantic-demo-resume-junior-frontend",
    expectedStrongIds: [
      "semantic-demo-job-frontend-react",
      "semantic-demo-job-frontend-dashboard",
    ],
    expectedMediumIds: [
      "semantic-demo-job-frontend-accessibility",
      "semantic-demo-job-fullstack-next-prisma",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-general-customer-support",
      "semantic-demo-job-general-content-coordinator",
    ],
  },
  {
    section: "resume-to-jobs",
    name: "Backend Node resume to jobs",
    sourceId: "semantic-demo-resume-backend-node",
    expectedStrongIds: [
      "semantic-demo-job-backend-node-api",
      "semantic-demo-job-backend-payments",
    ],
    expectedMediumIds: [
      "semantic-demo-job-backend-database-services",
      "semantic-demo-job-fullstack-saas-integrations",
      "semantic-demo-job-devops-platform-reliability",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-peopleops-hr-coordinator",
      "semantic-demo-job-general-office-operations",
    ],
  },
  {
    section: "resume-to-jobs",
    name: "Data AI resume to jobs",
    sourceId: "semantic-demo-resume-data-ai",
    expectedStrongIds: [
      "semantic-demo-job-data-ai-analyst",
      "semantic-demo-job-data-product-analyst",
    ],
    expectedMediumIds: [
      "semantic-demo-job-data-ml-evaluation",
      "semantic-demo-job-peopleops-talent-analyst",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-peopleops-hr-coordinator",
      "semantic-demo-job-general-office-operations",
    ],
  },
  {
    section: "resume-to-jobs",
    name: "DevOps cloud resume to jobs",
    sourceId: "semantic-demo-resume-devops-cloud",
    expectedStrongIds: [
      "semantic-demo-job-devops-cloud-ci",
      "semantic-demo-job-devops-platform-reliability",
    ],
    expectedMediumIds: [
      "semantic-demo-job-devops-release-operations",
      "semantic-demo-job-backend-payments",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-general-office-operations",
      "semantic-demo-job-peopleops-hr-coordinator",
    ],
  },
  {
    section: "resume-to-jobs",
    name: "People operations resume to jobs",
    sourceId: "semantic-demo-resume-hr-peopleops",
    expectedStrongIds: [
      "semantic-demo-job-peopleops-hr-coordinator",
      "semantic-demo-job-peopleops-talent-analyst",
    ],
    expectedMediumIds: [
      "semantic-demo-job-peopleops-psych-research",
      "semantic-demo-job-general-office-operations",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-data-ai-analyst",
      "semantic-demo-job-devops-release-operations",
    ],
  },
  {
    section: "resume-to-jobs",
    name: "Customer support resume to jobs",
    sourceId: "semantic-demo-resume-customer-support",
    expectedStrongIds: ["semantic-demo-job-general-customer-support"],
    expectedMediumIds: [
      "semantic-demo-job-general-content-coordinator",
      "semantic-demo-job-fullstack-saas-integrations",
    ],
    expectedDecoyIds: [
      "semantic-demo-job-frontend-react",
      "semantic-demo-job-backend-node-api",
    ],
  },
];

const jobToResumesCases: EvaluationCase[] = [
  {
    section: "job-to-resumes",
    name: "Frontend React job to resumes",
    sourceId: "semantic-demo-job-frontend-react",
    expectedStrongIds: [
      "semantic-demo-resume-junior-frontend",
      "semantic-demo-resume-react-ui",
    ],
    expectedMediumIds: ["semantic-demo-resume-fullstack-next"],
    expectedDecoyIds: [
      "semantic-demo-resume-customer-support",
      "semantic-demo-resume-hr-peopleops",
    ],
  },
  {
    section: "job-to-resumes",
    name: "Backend Node job to resumes",
    sourceId: "semantic-demo-job-backend-node-api",
    expectedStrongIds: [
      "semantic-demo-resume-backend-node",
      "semantic-demo-resume-fullstack-next",
    ],
    expectedMediumIds: ["semantic-demo-resume-devops-cloud"],
    expectedDecoyIds: [
      "semantic-demo-resume-general-admin",
      "semantic-demo-resume-customer-support",
    ],
  },
  {
    section: "job-to-resumes",
    name: "Data AI job to resumes",
    sourceId: "semantic-demo-job-data-ai-analyst",
    expectedStrongIds: [
      "semantic-demo-resume-data-ai",
      "semantic-demo-resume-ml-evaluation",
    ],
    expectedMediumIds: ["semantic-demo-resume-psychology-research"],
    expectedDecoyIds: [
      "semantic-demo-resume-hr-peopleops",
      "semantic-demo-resume-general-admin",
    ],
  },
  {
    section: "job-to-resumes",
    name: "DevOps cloud job to resumes",
    sourceId: "semantic-demo-job-devops-cloud-ci",
    expectedStrongIds: [
      "semantic-demo-resume-devops-cloud",
      "semantic-demo-resume-backend-node",
    ],
    expectedMediumIds: ["semantic-demo-resume-fullstack-next"],
    expectedDecoyIds: [
      "semantic-demo-resume-general-admin",
      "semantic-demo-resume-hr-peopleops",
    ],
  },
  {
    section: "job-to-resumes",
    name: "People operations job to resumes",
    sourceId: "semantic-demo-job-peopleops-hr-coordinator",
    expectedStrongIds: [
      "semantic-demo-resume-hr-peopleops",
      "semantic-demo-resume-psychology-research",
      "semantic-demo-resume-general-admin",
    ],
    expectedMediumIds: ["semantic-demo-resume-customer-support"],
    expectedDecoyIds: [
      "semantic-demo-resume-devops-cloud",
      "semantic-demo-resume-data-ai",
    ],
  },
  {
    section: "job-to-resumes",
    name: "Customer support job to resumes",
    sourceId: "semantic-demo-job-general-customer-support",
    expectedStrongIds: [
      "semantic-demo-resume-customer-support",
      "semantic-demo-resume-general-admin",
    ],
    expectedMediumIds: ["semantic-demo-resume-fullstack-next"],
    expectedDecoyIds: [
      "semantic-demo-resume-backend-node",
      "semantic-demo-resume-devops-cloud",
    ],
  },
];

let disconnectPrisma: (() => Promise<void>) | null = null;

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm evaluate:retrieval --email test@example.com");
  console.log(
    "  SEMANTIC_TEST_USER_EMAIL=test@example.com pnpm evaluate:retrieval",
  );
  console.log(
    "  pnpm evaluate:retrieval --email test@example.com --write-report",
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    email: null,
    help: false,
    writeReport: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--write-report") {
      options.writeReport = true;
      continue;
    }

    if (arg === "--email") {
      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error("--email requires an email address.");
      }

      options.email = value.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      options.email = arg.slice("--email=".length).trim();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.email =
    options.email || process.env.SEMANTIC_TEST_USER_EMAIL?.trim() || null;

  return options;
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

function requireTargetEmail(email: string | null) {
  if (!email) {
    throw new Error(
      "Missing target email. Pass --email test@example.com or set SEMANTIC_TEST_USER_EMAIL.",
    );
  }

  return email;
}

function setupInstructions(email: string) {
  return [
    "Prepare the semantic evaluation dataset, then rerun evaluation:",
    `  pnpm seed:semantic-test-data --email ${email}`,
    "  pnpm backfill:embeddings",
    "",
    "Example commands:",
    "  pnpm seed:semantic-test-data --email test@example.com",
    "  pnpm backfill:embeddings",
  ].join("\n");
}

function findMissingIds(expectedIds: string[], rows: OwnershipRow[]) {
  const foundIds = new Set(rows.map((row) => row.id));
  return expectedIds.filter((id) => !foundIds.has(id));
}

function listSome(ids: string[]) {
  const preview = ids.slice(0, 8).join(", ");
  return ids.length > 8 ? `${preview}, ...` : preview;
}

function assertOwnedDemoRecords({
  label,
  expectedIds,
  rows,
  userId,
  prefixCount,
  expectedCount,
  email,
}: {
  label: string;
  expectedIds: string[];
  rows: OwnershipRow[];
  userId: string;
  prefixCount: number;
  expectedCount: number;
  email: string;
}) {
  const missingIds = findMissingIds(expectedIds, rows);
  const otherUserIds = rows
    .filter((row) => row.userId !== userId)
    .map((row) => row.id);
  const ownedCount = rows.filter((row) => row.userId === userId).length;

  const problems = [
    prefixCount !== expectedCount
      ? `${label} count by semantic-demo prefix is ${prefixCount}, expected ${expectedCount}.`
      : null,
    ownedCount !== expectedCount
      ? `${label} owned deterministic record count is ${ownedCount}, expected ${expectedCount}.`
      : null,
    missingIds.length > 0
      ? `Missing ${label} IDs: ${listSome(missingIds)}`
      : null,
    otherUserIds.length > 0
      ? `${label} IDs owned by another user: ${listSome(otherUserIds)}`
      : null,
  ].filter(Boolean);

  if (problems.length > 0) {
    throw new Error(
      [
        `Semantic demo ${label} records are not ready for ${email}.`,
        ...problems,
        setupInstructions(email),
      ].join("\n"),
    );
  }
}

async function getEmbeddingPresenceRows(
  prisma: PrismaClientInstance,
  recordType: "jobPosting" | "resume",
  userId: string,
  ids: string[],
) {
  const { Prisma } = await import("../src/generated/prisma");

  if (recordType === "jobPosting") {
    return prisma.$queryRaw<EmbeddingPresenceRow[]>(
      Prisma.sql`
        SELECT "id",
               "embedding" IS NOT NULL AS "hasEmbedding",
               "embeddingTextHash" IS NOT NULL AS "hasEmbeddingTextHash"
        FROM "JobPosting"
        WHERE "userId" = ${userId}
          AND "id" IN (${Prisma.join(ids)})
      `,
    );
  }

  return prisma.$queryRaw<EmbeddingPresenceRow[]>(
    Prisma.sql`
      SELECT "id",
             "embedding" IS NOT NULL AS "hasEmbedding",
             "embeddingTextHash" IS NOT NULL AS "hasEmbeddingTextHash"
      FROM "Resume"
      WHERE "userId" = ${userId}
        AND "id" IN (${Prisma.join(ids)})
    `,
  );
}

function assertEmbeddingsPresent({
  label,
  expectedIds,
  rows,
  email,
}: {
  label: string;
  expectedIds: string[];
  rows: EmbeddingPresenceRow[];
  email: string;
}) {
  const foundIds = new Set(rows.map((row) => row.id));
  const missingRows = expectedIds.filter((id) => !foundIds.has(id));
  const missingEmbeddings = rows
    .filter((row) => !row.hasEmbedding || !row.hasEmbeddingTextHash)
    .map((row) => row.id);

  if (missingRows.length > 0 || missingEmbeddings.length > 0) {
    throw new Error(
      [
        `Semantic demo ${label} embeddings are not ready for ${email}.`,
        missingRows.length > 0
          ? `Missing ${label} embedding rows: ${listSome(missingRows)}`
          : null,
        missingEmbeddings.length > 0
          ? `Missing ${label} embedding data: ${listSome(missingEmbeddings)}`
          : null,
        setupInstructions(email),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

async function runPreflight(
  prisma: PrismaClientInstance,
  userId: string,
  email: string,
): Promise<DatasetPreflightSummary> {
  const [jobRows, resumeRows, jobPrefixCount, resumePrefixCount] =
    await Promise.all([
      prisma.jobPosting.findMany({
        where: {
          id: {
            in: demoJobPostingIds,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      }),
      prisma.resume.findMany({
        where: {
          id: {
            in: demoResumeIds,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      }),
      prisma.jobPosting.count({
        where: {
          userId,
          id: {
            startsWith: "semantic-demo-job-",
          },
        },
      }),
      prisma.resume.count({
        where: {
          userId,
          id: {
            startsWith: "semantic-demo-resume-",
          },
        },
      }),
    ]);

  assertOwnedDemoRecords({
    label: "job posting",
    expectedIds: demoJobPostingIds,
    rows: jobRows,
    userId,
    prefixCount: jobPrefixCount,
    expectedCount: EXPECTED_JOB_POSTING_COUNT,
    email,
  });

  assertOwnedDemoRecords({
    label: "resume",
    expectedIds: demoResumeIds,
    rows: resumeRows,
    userId,
    prefixCount: resumePrefixCount,
    expectedCount: EXPECTED_RESUME_COUNT,
    email,
  });

  const [jobEmbeddingRows, resumeEmbeddingRows] = await Promise.all([
    getEmbeddingPresenceRows(prisma, "jobPosting", userId, demoJobPostingIds),
    getEmbeddingPresenceRows(prisma, "resume", userId, demoResumeIds),
  ]);

  assertEmbeddingsPresent({
    label: "job posting",
    expectedIds: demoJobPostingIds,
    rows: jobEmbeddingRows,
    email,
  });

  assertEmbeddingsPresent({
    label: "resume",
    expectedIds: demoResumeIds,
    rows: resumeEmbeddingRows,
    email,
  });

  return {
    jobPostingCount: jobPrefixCount,
    resumeCount: resumePrefixCount,
    embeddedJobPostingCount: jobEmbeddingRows.filter(
      (row) => row.hasEmbedding && row.hasEmbeddingTextHash,
    ).length,
    embeddedResumeCount: resumeEmbeddingRows.filter(
      (row) => row.hasEmbedding && row.hasEmbeddingTextHash,
    ).length,
  };
}

function rankOf(id: string, returnedTopIds: string[]) {
  const index = returnedTopIds.indexOf(id);
  return index === -1 ? null : index + 1;
}

function bestRank(ids: string[], returnedTopIds: string[]) {
  const ranks = ids
    .map((id) => rankOf(id, returnedTopIds))
    .filter((rank): rank is number => rank !== null);

  return ranks.length > 0 ? Math.min(...ranks) : null;
}

function evaluateCase(
  evaluationCase: EvaluationCase,
  returnedTopIds: string[],
): EvaluationResult {
  const topFiveIds = returnedTopIds.slice(0, TOP_N);
  const strongIds = new Set(evaluationCase.expectedStrongIds);
  const strongCountAt5 = topFiveIds.filter((id) => strongIds.has(id)).length;
  const bestStrongRank = bestRank(evaluationCase.expectedStrongIds, topFiveIds);
  const bestMediumRank = bestRank(
    evaluationCase.expectedMediumIds ?? [],
    topFiveIds,
  );
  const bestDecoyRank = bestRank(
    evaluationCase.expectedDecoyIds ?? [],
    topFiveIds,
  );
  const primaryStrongRank = rankOf(
    evaluationCase.expectedStrongIds[0],
    topFiveIds,
  );
  const comparisonRanks = [bestMediumRank, bestDecoyRank].filter(
    (rank): rank is number => rank !== null,
  );
  const orderingOk =
    comparisonRanks.length === 0
      ? null
      : primaryStrongRank !== null &&
        comparisonRanks.every((rank) => primaryStrongRank < rank);

  return {
    ...evaluationCase,
    returnedTopIds: topFiveIds,
    top1Hit: topFiveIds[0] ? strongIds.has(topFiveIds[0]) : false,
    top3Hit: topFiveIds.slice(0, 3).some((id) => strongIds.has(id)),
    top5Hit: strongCountAt5 > 0,
    strongCountAt5,
    bestStrongRank,
    bestMediumRank,
    bestDecoyRank,
    orderingOk,
  };
}

async function runCase<T>(name: string, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    throw new Error(`Evaluation case failed (${name}): ${formatError(error)}`);
  }
}

async function runEvaluation(userId: string): Promise<EvaluationResult[]> {
  const {
    findSimilarJobPostingsToResume,
    findSimilarResumesToJobPosting,
    searchJobPostingsBySemanticQuery,
    searchResumesBySemanticQuery,
  } = await import("../src/lib/retrieval/semantic-search");

  const results: EvaluationResult[] = [];

  for (const evaluationCase of jobQueryCases) {
    const query = evaluationCase.query;

    if (!query) {
      throw new Error(`Missing query for case ${evaluationCase.name}.`);
    }

    const result = await runCase(evaluationCase.name, () =>
      searchJobPostingsBySemanticQuery({
        userId,
        query,
        limit: TOP_N,
        offset: 0,
      }),
    );

    results.push(
      evaluateCase(
        evaluationCase,
        result.jobPostings.map((jobPosting) => jobPosting.id),
      ),
    );
  }

  for (const evaluationCase of resumeQueryCases) {
    const query = evaluationCase.query;

    if (!query) {
      throw new Error(`Missing query for case ${evaluationCase.name}.`);
    }

    const result = await runCase(evaluationCase.name, () =>
      searchResumesBySemanticQuery({
        userId,
        query,
        limit: TOP_N,
        offset: 0,
      }),
    );

    results.push(
      evaluateCase(
        evaluationCase,
        result.resumes.map((resume) => resume.id),
      ),
    );
  }

  for (const evaluationCase of resumeToJobsCases) {
    const sourceId = evaluationCase.sourceId;

    if (!sourceId) {
      throw new Error(`Missing source ID for case ${evaluationCase.name}.`);
    }

    const result = await runCase(evaluationCase.name, () =>
      findSimilarJobPostingsToResume(userId, sourceId, TOP_N),
    );

    results.push(
      evaluateCase(
        evaluationCase,
        result.map((jobPosting) => jobPosting.id),
      ),
    );
  }

  for (const evaluationCase of jobToResumesCases) {
    const sourceId = evaluationCase.sourceId;

    if (!sourceId) {
      throw new Error(`Missing source ID for case ${evaluationCase.name}.`);
    }

    const result = await runCase(evaluationCase.name, () =>
      findSimilarResumesToJobPosting(userId, sourceId, TOP_N),
    );

    results.push(
      evaluateCase(
        evaluationCase,
        result.map((resume) => resume.id),
      ),
    );
  }

  return results;
}

function aggregateResults(results: EvaluationResult[]): AggregateSummary {
  const totalCases = results.length;
  const strongCountTotal = results.reduce(
    (total, result) => total + result.strongCountAt5,
    0,
  );

  return {
    totalCases,
    top1PassCount: results.filter((result) => result.top1Hit).length,
    top3PassCount: results.filter((result) => result.top3Hit).length,
    top5PassCount: results.filter((result) => result.top5Hit).length,
    averageStrongCountAt5:
      totalCases === 0 ? 0 : strongCountTotal / totalCases,
  };
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function formatOrdering(value: boolean | null) {
  return value === null ? "n/a" : formatBoolean(value);
}

function formatRank(value: number | null) {
  return value === null ? "-" : value.toString();
}

function formatIds(ids: string[]) {
  return ids.length > 0 ? ids.map((id) => `\`${id}\``).join(", ") : "-";
}

function formatInput(result: EvaluationResult) {
  if (result.query) {
    return `query: \`${result.query}\``;
  }

  if (result.sourceId) {
    return `source: \`${result.sourceId}\``;
  }

  return "-";
}

function renderSection(title: string, results: EvaluationResult[]) {
  const lines = [
    `## ${title}`,
    "",
    "| Case | Input | Expected strong IDs | Returned top IDs | Top-1 | Top-3 | Top-5 | strongCount@5 | Best strong | Best medium | Best decoy | Ordering OK |",
    "| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const result of results) {
    lines.push(
      [
        result.name,
        formatInput(result),
        formatIds(result.expectedStrongIds),
        formatIds(result.returnedTopIds),
        formatBoolean(result.top1Hit),
        formatBoolean(result.top3Hit),
        formatBoolean(result.top5Hit),
        result.strongCountAt5.toString(),
        formatRank(result.bestStrongRank),
        formatRank(result.bestMediumRank),
        formatRank(result.bestDecoyRank),
        formatOrdering(result.orderingOk),
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"),
    );
  }

  return lines.join("\n");
}

function renderReport({
  timestamp,
  email,
  userId,
  preflight,
  results,
}: {
  timestamp: string;
  email: string;
  userId: string;
  preflight: DatasetPreflightSummary;
  results: EvaluationResult[];
}) {
  const aggregate = aggregateResults(results);
  const jobQueryResults = results.filter(
    (result) => result.section === "job-query",
  );
  const resumeQueryResults = results.filter(
    (result) => result.section === "resume-query",
  );
  const similarRecordResults = results.filter(
    (result) =>
      result.section === "resume-to-jobs" ||
      result.section === "job-to-resumes",
  );

  return [
    "# Retrieval Evaluation Results",
    "",
    "Exact similarity scores can drift when embedding models, record text, or surrounding records change. Top-N relevance and cluster quality are the main judgment in this v1 harness.",
    "",
    "## Run Metadata",
    "",
    `- Run timestamp: ${timestamp}`,
    `- Target email: ${email}`,
    `- Target user ID: ${userId}`,
    `- Top-N limit: ${TOP_N}`,
    "",
    "## Dataset Preflight",
    "",
    `- Semantic demo job postings: ${preflight.jobPostingCount}/${EXPECTED_JOB_POSTING_COUNT}`,
    `- Semantic demo resumes: ${preflight.resumeCount}/${EXPECTED_RESUME_COUNT}`,
    `- Embedded job postings: ${preflight.embeddedJobPostingCount}/${EXPECTED_JOB_POSTING_COUNT}`,
    `- Embedded resumes: ${preflight.embeddedResumeCount}/${EXPECTED_RESUME_COUNT}`,
    "",
    "## Aggregate Summary",
    "",
    `- Total cases: ${aggregate.totalCases}`,
    `- Top-1 pass count: ${aggregate.top1PassCount}/${aggregate.totalCases}`,
    `- Top-3 pass count: ${aggregate.top3PassCount}/${aggregate.totalCases}`,
    `- Top-5 pass count: ${aggregate.top5PassCount}/${aggregate.totalCases}`,
    `- Average strongCount@5: ${aggregate.averageStrongCountAt5.toFixed(2)}`,
    "",
    renderSection("Job Posting Semantic Query Cases", jobQueryResults),
    "",
    renderSection("Resume Semantic Query Cases", resumeQueryResults),
    "",
    renderSection("Similar-Record Cases", similarRecordResults),
    "",
    "## Interpretation Notes",
    "",
    "- Relevance misses are evaluation findings, not script failures.",
    "- Medium matches can be acceptable when they reflect documented cluster overlap.",
    "- Decoys should generally rank below strong matches.",
    "- The script is read-only and does not generate record embeddings.",
  ].join("\n");
}

async function writeReport(report: string) {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${report}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const email = requireTargetEmail(options.email);
  assertRequiredEnv();

  const { prisma } = await import("../src/lib/prisma");
  disconnectPrisma = () => prisma.$disconnect();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error(
      `No user found for ${email}. Create or sign up that user first, then rerun this script.`,
    );
  }

  const timestamp = new Date().toISOString();
  const preflight = await runPreflight(prisma, user.id, user.email);
  const results = await runEvaluation(user.id);
  const report = renderReport({
    timestamp,
    email: user.email,
    userId: user.id,
    preflight,
    results,
  });

  console.log(report);

  if (options.writeReport) {
    await writeReport(report);
    console.log("");
    console.log(`Report written to ${REPORT_PATH}`);
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
