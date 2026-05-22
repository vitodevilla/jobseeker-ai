import { google } from "@ai-sdk/google";
import {
  generateText,
  JSONParseError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  TypeValidationError,
} from "ai";
import { z } from "zod";

type CareerContext = {
  targetRole: string | null;
  currentRole: string | null;
  targetLocations: string | null;
  yearsOfExperience: number | null;
  preferredWorkMode: string | null;
};

type ResumeContext = {
  name: string;
  content: string;
};

type CompanyContext = {
  name: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
};

type JobPostingContext = {
  title: string;
  description: string | null;
  location: string | null;
  workMode: string | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  company: CompanyContext;
};

type GenerateResumeJobMatchInput = {
  careerContext: CareerContext;
  resumeContext: ResumeContext;
  jobPostingContext: JobPostingContext;
};

const RESUME_JOB_MATCH_MODEL = "gemini-2.5-flash";

const nonEmptyString = z.string().min(1);

export const resumeJobMatchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  overallFit: nonEmptyString,
  strongMatches: z.array(nonEmptyString).min(1).max(6),
  gaps: z.array(nonEmptyString).min(1).max(6),
});

export type ResumeJobMatchResult = z.infer<
  typeof resumeJobMatchResultSchema
>;

export class EmptyResumeJobMatchOutputError extends Error {
  constructor() {
    super("Resume/job match output was empty.");
    this.name = "EmptyResumeJobMatchOutputError";
  }
}

export class InvalidResumeJobMatchOutputError extends Error {
  constructor() {
    super("Resume/job match output was invalid.");
    this.name = "InvalidResumeJobMatchOutputError";
  }
}

function formatSalary(context: JobPostingContext) {
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

function formatLines(
  entries: [label: string, value: string | number | null][],
  emptyMessage: string,
) {
  const lines = entries
    .filter(([, value]) => value !== null && value !== "")
    .map(([label, value]) => `- ${label}: ${value}`);

  return lines.length > 0 ? lines.join("\n") : `- ${emptyMessage}`;
}

function formatCareerContext(context: CareerContext) {
  return formatLines(
    [
      ["Target role", context.targetRole],
      ["Current role", context.currentRole],
      ["Target locations", context.targetLocations],
      ["Years of experience", context.yearsOfExperience],
      ["Preferred work mode", context.preferredWorkMode],
    ],
    "No career context provided.",
  );
}

function formatJobPostingContext(context: JobPostingContext) {
  return formatLines(
    [
      ["Title", context.title],
      ["Location", context.location],
      ["Work mode", context.workMode],
      ["Seniority", context.seniorityLevel],
      ["Salary", formatSalary(context)],
    ],
    "No job posting metadata provided.",
  );
}

function formatCompanyContext(context: CompanyContext) {
  return formatLines(
    [
      ["Name", context.name],
      ["Industry", context.industry],
      ["Website", context.website],
      ["Notes", context.notes],
    ],
    "No company context provided.",
  );
}

function buildResumeJobMatchPrompt({
  careerContext,
  resumeContext,
  jobPostingContext,
}: GenerateResumeJobMatchInput) {
  const jobDescription =
    jobPostingContext.description?.trim() || "No job description provided.";

  return `Analyze how well this resume matches this saved job posting.

Use only the saved database context below. Do not fetch, browse, scrape, or imply that you visited the company website or any job posting URL. Website fields are saved references only.

Career context:
${formatCareerContext(careerContext)}

Resume context:
- Resume name: ${resumeContext.name}

Resume text:
"""${resumeContext.content}"""

Job posting context:
${formatJobPostingContext(jobPostingContext)}

Job description:
"""${jobDescription}"""

Company context:
${formatCompanyContext(jobPostingContext.company)}

Return a practical resume/job match analysis as a structured object with:
- score: integer from 0 to 100
- overallFit: concise paragraph
- strongMatches: 3-5 concise bullets
- gaps: 3-5 concise bullets covering missing evidence, risks, or unclear alignment

If no strong matches are evident, include one strongMatches item exactly like this: "No strong matches identified from the provided context."

Score the match using evidence from the resume and job posting. Keep this diagnostic: answer how well this resume matches this job. Do not suggest resume edits; detailed tailoring advice belongs to a separate tailoring feature. Do not invent resume experience, job requirements, employers, tools, metrics, achievements, credentials, or locations. If information is missing or unclear, say so in the relevant field. Do not generate a cover letter. Avoid overconfident claims.`;
}

function normalizeString(value: string) {
  return value.trim();
}

function normalizeList(values: string[]) {
  return values.map(normalizeString).filter(Boolean);
}

function validateResumeJobMatchResult(output: ResumeJobMatchResult) {
  const parsed = resumeJobMatchResultSchema.safeParse({
    score: output.score,
    overallFit: normalizeString(output.overallFit),
    strongMatches: normalizeList(output.strongMatches),
    gaps: normalizeList(output.gaps),
  });

  if (!parsed.success) {
    throw new InvalidResumeJobMatchOutputError();
  }

  return parsed.data;
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatResumeJobMatchAnalysis(result: ResumeJobMatchResult) {
  return `## Match score
${result.score}/100

## Overall fit
${result.overallFit}

## Strong matches
${formatList(result.strongMatches)}

## Gaps or risks
${formatList(result.gaps)}`;
}

export async function generateResumeJobMatch(
  input: GenerateResumeJobMatchInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  try {
    const generation = await generateText({
      model: google(RESUME_JOB_MATCH_MODEL),
      output: Output.object({
        schema: resumeJobMatchResultSchema,
        name: "resumeJobMatch",
        description: "A concise resume to job posting match analysis.",
      }),
      system:
        "You are a senior resume and job fit analyst. Compare a resume against one saved job posting using only provided context. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts. Do not browse URLs. Do not suggest resume edits, rewrite the resume, or generate cover letters.",
      prompt: buildResumeJobMatchPrompt(input),
      temperature: 0.2,
      maxOutputTokens: 3500,
    });

    let output: ResumeJobMatchResult;

    try {
      output = generation.output;
    } catch (error) {
      if (
        error instanceof NoOutputGeneratedError &&
        !generation.text.trim()
      ) {
        throw new EmptyResumeJobMatchOutputError();
      }

      throw new InvalidResumeJobMatchOutputError();
    }

    if (!output) {
      throw new EmptyResumeJobMatchOutputError();
    }

    const result = validateResumeJobMatchResult(output);

    return {
      result,
      matchAnalysis: formatResumeJobMatchAnalysis(result),
    };
  } catch (error) {
    if (error instanceof EmptyResumeJobMatchOutputError) {
      throw error;
    }

    if (error instanceof NoOutputGeneratedError) {
      throw new EmptyResumeJobMatchOutputError();
    }

    if (
      error instanceof JSONParseError ||
      error instanceof NoObjectGeneratedError ||
      error instanceof TypeValidationError ||
      error instanceof InvalidResumeJobMatchOutputError
    ) {
      throw new InvalidResumeJobMatchOutputError();
    }

    throw error;
  }
}
