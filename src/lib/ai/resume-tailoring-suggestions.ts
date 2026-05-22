import { google } from "@ai-sdk/google";
import { generateText } from "ai";

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

type SavedJobMatchContext = {
  score: number | null;
  analysis: string;
} | null;

type GenerateResumeTailoringSuggestionsInput = {
  careerContext: CareerContext;
  resumeContext: ResumeContext;
  jobPostingContext: JobPostingContext;
  savedJobMatchContext: SavedJobMatchContext;
};

const RESUME_TAILORING_SUGGESTIONS_MODEL = "gemini-2.5-flash";

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

function formatSavedJobMatchContext(context: SavedJobMatchContext) {
  if (!context) {
    return "- No relevant saved resume/job match analysis provided.";
  }

  return formatLines(
    [
      ["Match score", context.score],
      ["Match analysis", context.analysis],
    ],
    "No relevant saved resume/job match analysis provided.",
  );
}

function buildResumeTailoringSuggestionsPrompt({
  careerContext,
  resumeContext,
  jobPostingContext,
  savedJobMatchContext,
}: GenerateResumeTailoringSuggestionsInput) {
  const jobDescription =
    jobPostingContext.description?.trim() || "No job description provided.";

  return `Create practical, advice-only resume tailoring suggestions for this saved resume and saved job posting.

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

Relevant saved resume/job match context:
${formatSavedJobMatchContext(savedJobMatchContext)}

Return concise markdown-style advice with exactly these sections:

## Tailoring verdict
Say whether the resume needs meaningful tailoring for this job. You may say exactly: "No major tailoring is needed."

## High-impact changes, if any
List only changes that are genuinely useful. This section may be minimal if the resume is already well aligned.

## Keywords to mirror if truthful
List only role-relevant wording from the saved job context that the resume can honestly mirror. Avoid keyword stuffing.

## Experience to emphasize
List resume-backed experience to bring forward or emphasize for this role.

## Gaps to avoid overclaiming
List gaps, weak evidence, or areas where the user should avoid overstating experience.

## Keep as-is
List what already works and should not be changed.

Do not produce filler suggestions just to fill sections. If the resume is already well aligned, say so and keep recommendations minimal. Only suggest adding or emphasizing something if it is supported by the existing resume or clearly framed as "if truthful." Do not invent resume experience, job requirements, metrics, employers, tools, certifications, achievements, credentials, or locations. Warn about overclaiming where appropriate. Do not rewrite the resume automatically. Do not create a resume version. Do not generate a cover letter. Keep the output practical, concise, and advice-only. Aim for 250-500 words, and do not exceed 650 words.`;
}

export async function generateResumeTailoringSuggestions(
  input: GenerateResumeTailoringSuggestionsInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(RESUME_TAILORING_SUGGESTIONS_MODEL),
    system:
      "You provide concise resume tailoring advice for a specific saved job posting using only provided database context. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts. Do not browse URLs. Do not rewrite resumes or generate cover letters.",
    prompt: buildResumeTailoringSuggestionsPrompt(input),
    temperature: 0.25,
    maxOutputTokens: 2800,
  });

  return text.trim();
}
