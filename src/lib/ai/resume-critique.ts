import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type CareerContext = {
  targetRole: string | null;
  currentRole: string | null;
  targetLocations: string | null;
  yearsOfExperience: number | null;
  preferredWorkMode: string | null;
};

type GenerateResumeCritiqueInput = {
  resumeName: string;
  resumeContent: string;
  careerContext: CareerContext;
};

const RESUME_CRITIQUE_MODEL = "gemini-2.5-flash";

function formatCareerContext(context: CareerContext) {
  const lines = [
    ["Target role", context.targetRole],
    ["Current role", context.currentRole],
    ["Target locations", context.targetLocations],
    [
      "Years of experience",
      context.yearsOfExperience === null
        ? null
        : context.yearsOfExperience.toString(),
    ],
    ["Preferred work mode", context.preferredWorkMode],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `- ${label}: ${value}`);

  return lines.length > 0
    ? lines.join("\n")
    : "- No career context provided.";
}

function buildResumeCritiquePrompt({
  resumeName,
  resumeContent,
  careerContext,
}: GenerateResumeCritiqueInput) {
  return `Review this resume for a job seeker and return markdown feedback only.

Career context:
${formatCareerContext(careerContext)}

Resume name:
${resumeName}

Resume text:
"""${resumeContent}"""

Write a focused critique with these markdown sections:

## Overall impression
Write 1 short paragraph assessing how well the resume supports the user's target.

## Strengths
List 3-5 bullets covering the strongest parts of the resume.

## Highest-impact improvements
List 3-5 bullets covering the most important edits, ordered by impact. Be specific and actionable.

## Suggested rewrites
Provide 2-3 example bullet rewrites maximum using only information present in the resume. Do not invent metrics, employers, tools, or achievements.

## ATS and readability notes
List 3-5 bullets covering formatting, keyword, clarity, and scanability improvements.

Keep the response practical, direct, and complete. Aim for 500-750 words, and do not exceed 900 words.`;
}

export async function generateResumeCritique(
  input: GenerateResumeCritiqueInput,
) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }

  const { text } = await generateText({
    model: google(RESUME_CRITIQUE_MODEL),
    system:
      "You are a senior resume reviewer. You critique resumes for a specific job-search context. Be honest, concrete, and helpful. Do not act like a chatbot. Do not ask follow-up questions. Do not invent facts.",
    prompt: buildResumeCritiquePrompt(input),
    temperature: 0.3,
    maxOutputTokens: 3500,
  });

  return text.trim();
}
