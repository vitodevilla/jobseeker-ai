import { createHash } from "node:crypto";
import { google, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embed } from "ai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSION = 3072;
export const EMBEDDING_TASK_TYPE = "SEMANTIC_SIMILARITY";
export const EMBEDDING_TEXT_HASH_VERSION =
  "embedding:v1:gemini-embedding-001:3072";

type ResumeEmbeddingInput = {
  name: string;
  content: string | null;
};

type JobPostingEmbeddingInput = {
  title: string;
  description: string | null;
  location: string | null;
  workMode: string | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  company: {
    name: string;
    industry: string | null;
    notes: string | null;
  };
};

function normalizeEmbeddingText(text: string) {
  return text.replaceAll("\r\n", "\n").trim();
}

function normalizeField(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const normalized = value.toString().replaceAll("\r\n", "\n").trim();
  return normalized || null;
}

function formatField(label: string, value: string | number | null) {
  const normalized = normalizeField(value);

  if (!normalized) {
    return null;
  }

  return `${label}:\n${normalized}`;
}

function formatSalary(context: JobPostingEmbeddingInput) {
  const { salaryMin, salaryMax, salaryCurrency } = context;

  if (salaryMin === null && salaryMax === null) {
    return null;
  }

  const currency = salaryCurrency ? ` ${salaryCurrency}` : "";

  if (salaryMin !== null && salaryMax !== null) {
    return `${salaryMin}-${salaryMax}${currency}`;
  }

  if (salaryMin !== null) {
    return `From ${salaryMin}${currency}`;
  }

  return `Up to ${salaryMax}${currency}`;
}

function joinFields(fields: Array<string | null>) {
  return fields.filter(Boolean).join("\n\n").trim();
}

export function validateEmbeddingVector(vector: number[]) {
  if (!Array.isArray(vector)) {
    throw new Error("Embedding result was not an array.");
  }

  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${vector.length}.`,
    );
  }

  for (const value of vector) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Embedding vector contains a non-finite number.");
    }
  }

  return vector;
}

export async function generateEmbedding(text: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const value = normalizeEmbeddingText(text);

  if (!value) {
    throw new Error("Embedding text must not be empty.");
  }

  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value,
    providerOptions: {
      google: {
        taskType: EMBEDDING_TASK_TYPE,
      } satisfies GoogleEmbeddingModelOptions,
    },
  });

  return validateEmbeddingVector(embedding);
}

export function hashEmbeddingText(text: string) {
  return createHash("sha256")
    .update(EMBEDDING_TEXT_HASH_VERSION)
    .update("\n")
    .update(normalizeEmbeddingText(text))
    .digest("hex");
}

export function formatResumeEmbeddingText(resume: ResumeEmbeddingInput) {
  return joinFields([
    formatField("Resume name", resume.name),
    formatField("Resume content", resume.content),
  ]);
}

export function formatJobPostingEmbeddingText(
  jobPosting: JobPostingEmbeddingInput,
) {
  return joinFields([
    formatField("Job title", jobPosting.title),
    formatField("Job description", jobPosting.description),
    formatField("Location", jobPosting.location),
    formatField("Work mode", jobPosting.workMode),
    formatField("Seniority", jobPosting.seniorityLevel),
    formatField("Salary", formatSalary(jobPosting)),
    formatField("Company name", jobPosting.company.name),
    formatField("Company industry", jobPosting.company.industry),
    formatField("Company notes", jobPosting.company.notes),
  ]);
}
