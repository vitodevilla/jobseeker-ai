import { google } from "@ai-sdk/google";
import { generateText } from "ai";

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
  url: string | null;
  company: CompanyContext;
};

type GenerateJobPostingSummaryInput = {
  jobPostingContext: JobPostingContext;
};

const JOB_POSTING_SUMMARY_MODEL = "gemini-2.5-flash";

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

function formatJobPostingContext(context: JobPostingContext) {
  const description =
    context.description?.trim() || "No job description provided.";

  return formatLines(
    [
      ["Title", context.title],
      ["Location", context.location],
      ["Work mode", context.workMode],
      ["Seniority", context.seniorityLevel],
      ["Salary", formatSalary(context)],
      ["Reference URL", context.url],
      ["Description", description],
    ],
    "No job posting context provided.",
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

function buildJobPostingSummaryPrompt({
  jobPostingContext,
}: GenerateJobPostingSummaryInput) {
  return `Summarize this saved job posting for a job seeker and return concise markdown only.

Use only the saved database context below. Do not fetch, browse, scrape, or imply that you visited the reference URL or company website. The URL and website are saved references only.

Job posting context:
${formatJobPostingContext(jobPostingContext)}

Company context:
${formatCompanyContext(jobPostingContext.company)}

Write the summary with these markdown sections:

## Overall role snapshot
Write 1-2 short sentences summarizing what the role appears to be from the saved context.

## Key responsibilities
List 3 bullets maximum. If responsibilities are unclear, say what is not specified instead of inventing details.

## Required skills and qualifications
List 3 bullets maximum based only on explicit saved context.

## Nice-to-have signals
List 2 bullets maximum based only on explicit saved context. If there are no clear nice-to-have signals, say that they are not specified.

## Company/context notes
List 2 bullets maximum about the company and saved role context.

## Questions to clarify
List 2 practical questions maximum that an applicant may want to investigate later. These are not follow-up questions to the user.

Do not invent facts. Do not compare this job to a resume. Do not assess user fit. Do not produce a match score. Do not ask the user follow-up questions. Keep the response practical and complete. Aim for 180-300 words, and do not exceed 350 words.`;
}

export async function generateJobPostingSummary(
  input: GenerateJobPostingSummaryInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(JOB_POSTING_SUMMARY_MODEL),
    system:
      "You summarize saved job postings using only provided database context. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts. Do not assess user fit, compare against resumes, or produce match scores. Never imply that you visited a URL.",
    prompt: buildJobPostingSummaryPrompt(input),
    temperature: 0.3,
    maxOutputTokens: 2000,
  });

  return text.trim();
}
