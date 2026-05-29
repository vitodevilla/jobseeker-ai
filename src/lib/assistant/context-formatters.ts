const QUERY_TERM_LIMIT = 8;
const RESUME_EXCERPT_LENGTH = 900;
const JOB_DESCRIPTION_EXCERPT_LENGTH = 700;
const NOTES_EXCERPT_LENGTH = 300;
const ANALYSIS_EXCERPT_LENGTH = 500;

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "all",
  "and",
  "any",
  "are",
  "around",
  "based",
  "been",
  "before",
  "best",
  "can",
  "could",
  "current",
  "data",
  "does",
  "fit",
  "fits",
  "from",
  "have",
  "how",
  "into",
  "job",
  "jobs",
  "knowledge",
  "look",
  "looks",
  "need",
  "needs",
  "next",
  "posting",
  "postings",
  "profile",
  "relevant",
  "require",
  "required",
  "requires",
  "resume",
  "resumes",
  "saved",
  "seem",
  "should",
  "show",
  "that",
  "the",
  "their",
  "there",
  "this",
  "week",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

export function normalizeText(value: string | null | undefined) {
  return value?.replaceAll("\r\n", "\n").replace(/\s+/g, " ").trim() ?? "";
}

export function truncateText(value: string | null | undefined, maxLength: number) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

export function excerptAroundTerms(
  value: string | null | undefined,
  terms: string[],
  maxLength: number,
) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (text.length <= maxLength) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const firstMatch = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const anchor = firstMatch ?? 0;
  const start = Math.max(0, anchor - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function formatDate(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "not set";
}

export function formatDateTime(date: Date | null | undefined) {
  return date ? date.toISOString() : "not set";
}

export function formatStatus(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "not set";
}

export function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "not set";
  }

  return value.toString();
}

export function formatSalary(jobPosting: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}) {
  const salaryMin = jobPosting.salaryMin ?? null;
  const salaryMax = jobPosting.salaryMax ?? null;
  const { salaryCurrency } = jobPosting;

  if (salaryMin === null && salaryMax === null) {
    return "not set";
  }

  const currency = salaryCurrency ? ` ${salaryCurrency}` : "";

  if (salaryMin !== null && salaryMax !== null) {
    return `${salaryMin}-${salaryMax}${currency}`;
  }

  if (salaryMin !== null) {
    return `from ${salaryMin}${currency}`;
  }

  return `up to ${salaryMax}${currency}`;
}

export function section(title: string, lines: string[], emptyMessage: string) {
  return [`## ${title}`, lines.length > 0 ? lines.join("\n") : `- ${emptyMessage}`].join(
    "\n",
  );
}

export function getQuestionTerms(question: string) {
  const tokens = question.match(/[A-Za-z0-9][A-Za-z0-9+#.-]*/g) ?? [];
  const terms: string[] = [];

  for (const token of tokens) {
    const term = token
      .toLowerCase()
      .replace(/^[^a-z0-9+#.]+|[^a-z0-9+#.]+$/g, "");

    if (!term || STOP_WORDS.has(term)) {
      continue;
    }

    if (term.length < 3 && !/[+#.]/.test(term)) {
      continue;
    }

    if (!terms.includes(term)) {
      terms.push(term);
    }

    if (terms.length >= QUERY_TERM_LIMIT) {
      break;
    }
  }

  return terms;
}

export function formatJobPostingLine({
  index,
  sourceKey,
  companyKey,
  jobPosting,
  terms,
  similarity,
}: {
  index: number;
  sourceKey: string;
  companyKey: string;
  jobPosting: {
    title: string;
    description: string | null;
    location: string | null;
    workMode: string | null;
    seniorityLevel: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    deadline: Date | null;
    savedAt: Date;
    aiSummary?: string | null;
    matchScore?: number | null;
    matchAnalysis?: string | null;
    company: {
      name: string;
      industry: string | null;
      notes?: string | null;
    };
  };
  terms: string[];
  similarity?: number;
}) {
  const descriptionSnippet = excerptAroundTerms(
    jobPosting.description,
    terms,
    JOB_DESCRIPTION_EXCERPT_LENGTH,
  );
  const companyNotes = truncateText(jobPosting.company.notes, NOTES_EXCERPT_LENGTH);
  const aiSummary = truncateText(jobPosting.aiSummary, ANALYSIS_EXCERPT_LENGTH);
  const matchAnalysis = truncateText(
    jobPosting.matchAnalysis,
    ANALYSIS_EXCERPT_LENGTH,
  );
  const parts = [
    `${index}. Source ${sourceKey}: ${jobPosting.title} at ${jobPosting.company.name} (company source ${companyKey})`,
    `location: ${formatValue(jobPosting.location)}`,
    `work mode: ${formatStatus(jobPosting.workMode)}`,
    `seniority: ${formatValue(jobPosting.seniorityLevel)}`,
    `salary: ${formatSalary(jobPosting)}`,
    `deadline: ${formatDate(jobPosting.deadline)}`,
    `saved: ${formatDate(jobPosting.savedAt)}`,
  ];

  if (similarity !== undefined) {
    parts.push(`semantic similarity: ${Math.round(similarity * 100)}%`);
  }

  if (jobPosting.matchScore !== undefined && jobPosting.matchScore !== null) {
    parts.push(`saved match score: ${jobPosting.matchScore}/100`);
  }

  if (descriptionSnippet) {
    parts.push(`description excerpt: ${descriptionSnippet}`);
  }

  if (aiSummary) {
    parts.push(`saved AI summary excerpt: ${aiSummary}`);
  }

  if (matchAnalysis) {
    parts.push(`saved match analysis excerpt: ${matchAnalysis}`);
  }

  if (companyNotes) {
    parts.push(`company notes excerpt: ${companyNotes}`);
  }

  return `- ${parts.join("; ")}`;
}

export function formatResumeLine({
  index,
  sourceKey,
  resume,
  terms,
  similarity,
}: {
  index: number;
  sourceKey: string;
  resume: {
    name: string;
    content: string | null;
    updatedAt?: Date;
    createdAt?: Date;
    aiFeedbackAt?: Date | null;
  };
  terms: string[];
  similarity?: number;
}) {
  const contentExcerpt = excerptAroundTerms(
    resume.content,
    terms,
    RESUME_EXCERPT_LENGTH,
  );
  const parts = [
    `${index}. Source ${sourceKey}: ${resume.name}`,
    resume.updatedAt ? `updated: ${formatDate(resume.updatedAt)}` : null,
    resume.createdAt ? `created: ${formatDate(resume.createdAt)}` : null,
    resume.aiFeedbackAt
      ? `AI critique last generated: ${formatDate(resume.aiFeedbackAt)}`
      : null,
    similarity !== undefined
      ? `semantic similarity: ${Math.round(similarity * 100)}%`
      : null,
    contentExcerpt ? `content excerpt: ${contentExcerpt}` : null,
  ].filter(Boolean);

  return `- ${parts.join("; ")}`;
}

export function uniqueById<T extends { id: string }>(records: T[]) {
  const seen = new Set<string>();
  const uniqueRecords: T[] = [];

  for (const record of records) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      uniqueRecords.push(record);
    }
  }

  return uniqueRecords;
}
