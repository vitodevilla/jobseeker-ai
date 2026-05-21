import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type CareerContext = {
  targetRole: string | null;
  currentRole: string | null;
  targetLocations: string | null;
  yearsOfExperience: number | null;
  preferredWorkMode: string | null;
};

type InterviewContext = {
  type: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  locationOrLink: string | null;
  interviewerName: string | null;
  interviewerEmail: string | null;
  outcome: string;
  feedback: string | null;
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
  description: string | null;
  location: string | null;
  workMode: string | null;
  seniorityLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  company: CompanyContext;
};

type ResumeContext = {
  name: string;
  content: string;
} | null;

type SavedJobMatchContext = {
  score: number | null;
  analysis: string;
} | null;

type GenerateInterviewPrepNotesInput = {
  careerContext: CareerContext;
  interviewContext: InterviewContext;
  applicationContext: ApplicationContext;
  jobPostingContext: JobPostingContext;
  resumeContext: ResumeContext;
  savedJobMatchContext: SavedJobMatchContext;
};

const INTERVIEW_PREP_MODEL = "gemini-2.5-flash";

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function formatDateTime(date: Date) {
  return date.toISOString();
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

function formatInterviewContext(context: InterviewContext) {
  return formatLines(
    [
      ["Type", context.type],
      ["Scheduled at", formatDateTime(context.scheduledAt)],
      ["Duration minutes", context.durationMinutes],
      ["Location or link", context.locationOrLink],
      ["Interviewer name", context.interviewerName],
      ["Interviewer email", context.interviewerEmail],
      ["Outcome", context.outcome],
      ["Feedback", context.feedback],
    ],
    "No interview context provided.",
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

function formatResumeContext(context: ResumeContext) {
  if (!context) {
    return "- No linked owned resume content provided.";
  }

  return formatLines(
    [
      ["Resume name", context.name],
      ["Resume content", context.content],
    ],
    "No resume context provided.",
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

function buildInterviewPrepPrompt({
  careerContext,
  interviewContext,
  applicationContext,
  jobPostingContext,
  resumeContext,
  savedJobMatchContext,
}: GenerateInterviewPrepNotesInput) {
  return `Create saved interview preparation notes for this job seeker and return markdown notes only.

Use only the saved database context below. Do not fetch, browse, scrape, or imply that you visited the company website or a job posting URL. Website fields are saved references only.

Career context:
${formatCareerContext(careerContext)}

Interview context:
${formatInterviewContext(interviewContext)}

Application context:
${formatApplicationContext(applicationContext)}

Job posting context:
${formatJobPostingContext(jobPostingContext)}

Company context:
${formatCompanyContext(jobPostingContext.company)}

Resume context:
${formatResumeContext(resumeContext)}

Saved resume/job match context:
${formatSavedJobMatchContext(savedJobMatchContext)}

Write concise markdown-style prep notes with these sections:

## Interview overview
Summarize the interview, role, company, and available context in 2-4 bullets. If key details are missing, say so.

## Likely interview questions
List 6-10 likely questions tailored to the interview type and saved job context.

## Strong talking points
List 4-7 talking points grounded in the provided resume, application, career, job, company, or match context.

## Role/company-specific preparation notes
List 4-7 practical notes for preparing for this specific role and company from saved context.

## Gaps or weaknesses to prepare for
List 3-6 potential gaps, risks, or missing details to prepare for. If resume context is missing, mention that.

## Questions to ask the interviewer
List 5-8 thoughtful questions the candidate can ask. These are questions for the interviewer, not follow-up questions to the user.

## Final preparation checklist
List 5-8 concrete final prep steps.

Do not invent resume experience, tools, achievements, requirements, company facts, metrics, employers, credentials, or locations. If information is missing or unclear, say so. Do not ask the user follow-up questions. Do not simulate an interview. Do not generate a cover letter. Keep the response practical, structured, and complete. Aim for 600-900 words, and do not exceed 1000 words.`;
}

export async function generateInterviewPrepNotes(
  input: GenerateInterviewPrepNotesInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(INTERVIEW_PREP_MODEL),
    system:
      "You create saved interview preparation notes for a job seeker using only provided database context. Do not act like a chatbot. Do not ask follow-up questions. Do not simulate an interview. Do not browse URLs. Do not invent facts. Do not generate cover letters.",
    prompt: buildInterviewPrepPrompt(input),
    temperature: 0.3,
    maxOutputTokens: 3500,
  });

  return text.trim();
}
