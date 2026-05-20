import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type CareerContext = {
  targetRole: string | null;
  currentRole: string | null;
  targetLocations: string | null;
  yearsOfExperience: number | null;
  preferredWorkMode: string | null;
};

type ApplicationContext = {
  status: string;
  priority: string;
  appliedAt: Date | null;
  nextActionDate: Date | null;
  notes: string | null;
};

type CompanyContext = {
  name: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
};

type JobPostingContext = {
  title: string;
  description: string;
  location: string | null;
  workMode: string | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  company: CompanyContext;
};

type GenerateCoverLetterCritiqueInput = {
  coverLetterTitle: string;
  coverLetterMode: string;
  coverLetterContent: string;
  version: number;
  isFinal: boolean;
  careerContext: CareerContext;
  applicationContext: ApplicationContext;
  jobPostingContext: JobPostingContext;
};

const COVER_LETTER_CRITIQUE_MODEL = "gemini-2.5-flash";

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
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
  entries: [label: string, value: string | number | boolean | null][],
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

function formatApplicationContext(context: ApplicationContext) {
  return formatLines(
    [
      ["Status", context.status],
      ["Priority", context.priority],
      ["Applied at", formatDate(context.appliedAt)],
      ["Next action date", formatDate(context.nextActionDate)],
      ["Notes", context.notes],
    ],
    "No application context provided.",
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
      ["Description", context.description],
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

function buildCoverLetterCritiquePrompt({
  coverLetterTitle,
  coverLetterMode,
  coverLetterContent,
  version,
  isFinal,
  careerContext,
  applicationContext,
  jobPostingContext,
}: GenerateCoverLetterCritiqueInput) {
  return `Review this cover letter for a job seeker and return markdown feedback only.

Career context:
${formatCareerContext(careerContext)}

Application context:
${formatApplicationContext(applicationContext)}

Job posting context:
${formatJobPostingContext(jobPostingContext)}

Company context:
${formatCompanyContext(jobPostingContext.company)}

Cover letter metadata:
- Title: ${coverLetterTitle}
- Mode: ${coverLetterMode}
- Version: ${version}
- Final version: ${isFinal ? "yes" : "no"}

Cover letter text:
"""${coverLetterContent}"""

Write a concise critique with these markdown sections:

## Overall impression
Write 1 short paragraph assessing fit, specificity, and persuasiveness.

## Strengths
List 3-5 bullets covering the strongest parts of the letter.

## Highest-impact improvements
List 3-5 bullets covering the most important edits, ordered by impact.

## Job/company alignment
List 3-5 bullets about how well the letter connects to the job and company context.

## Suggested rewrites
Provide 2-3 short examples maximum using only information present in the cover letter or linked context.

## Tone and readability notes
List 3-5 bullets covering clarity, tone, structure, and concision.

Do not invent achievements, employers, metrics, tools, or experience. Do not ask follow-up questions. Keep the response practical, direct, and complete. Aim for 450-700 words, and do not exceed 850 words.`;
}

export async function generateCoverLetterCritique(
  input: GenerateCoverLetterCritiqueInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(COVER_LETTER_CRITIQUE_MODEL),
    system:
      "You are a senior cover letter reviewer. You critique cover letters for a specific job-search context. Be honest, concrete, and helpful. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts.",
    prompt: buildCoverLetterCritiquePrompt(input),
    temperature: 0.3,
    maxOutputTokens: 3500,
  });

  return text.trim();
}
