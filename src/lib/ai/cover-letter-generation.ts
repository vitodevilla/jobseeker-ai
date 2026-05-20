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
  notes: string | null;
};

type ResumeContext = {
  name: string;
  content: string | null;
} | null;

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

type GenerateCoverLetterDraftInput = {
  careerContext: CareerContext;
  applicationContext: ApplicationContext;
  resumeContext: ResumeContext;
  jobPostingContext: JobPostingContext;
};

const COVER_LETTER_GENERATION_MODEL = "gemini-2.5-flash";

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

function formatApplicationContext(context: ApplicationContext) {
  return formatLines(
    [
      ["Status", context.status],
      ["Priority", context.priority],
      ["Notes", context.notes],
    ],
    "No application context provided.",
  );
}

function formatResumeContext(context: ResumeContext) {
  if (!context) {
    return "- No linked resume provided.";
  }

  const content = context.content?.trim() || "No resume content provided.";

  return formatLines(
    [
      ["Resume name", context.name],
      ["Resume content", content],
    ],
    "No resume context provided.",
  );
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

function buildCoverLetterGenerationPrompt({
  careerContext,
  applicationContext,
  resumeContext,
  jobPostingContext,
}: GenerateCoverLetterDraftInput) {
  return `Draft a concise first-pass cover letter for this application.

Career context:
${formatCareerContext(careerContext)}

Application context:
${formatApplicationContext(applicationContext)}

Resume context:
${formatResumeContext(resumeContext)}

Job posting context:
${formatJobPostingContext(jobPostingContext)}

Company context:
${formatCompanyContext(jobPostingContext.company)}

Write only the cover letter body/content. Do not include markdown headings. Do not include meta-commentary such as "Here is your cover letter."

Use only the provided user, application, job, company, and resume context. Do not invent employers, achievements, metrics, tools, degrees, certifications, locations, or experience. If details are missing, stay general rather than fabricating specifics.

Use a professional, realistic, concise, editable tone. Prefer concrete details from the linked context where available. Avoid overly generic corporate language.`;
}

export async function generateCoverLetterDraft(
  input: GenerateCoverLetterDraftInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(COVER_LETTER_GENERATION_MODEL),
    system:
      "You draft first-pass cover letters for a specific job-search context. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts.",
    prompt: buildCoverLetterGenerationPrompt(input),
    temperature: 0.4,
    maxOutputTokens: 2800,
  });

  return text.trim();
}
