# AI System Overview

## What JobSeeker AI Is

JobSeeker AI is a full-stack job-search tracker. It stores user-owned records for resumes, companies, job postings, applications, cover letters, interviews, and tasks. The AI layer works on top of those saved records.

The current implementation is not a general chatbot. It is a set of task-specific AI and retrieval features connected to concrete app workflows.

## AI System Goals

- Use saved app records as context for AI outputs.
- Keep AI actions explicit and user-triggered.
- Store useful generated outputs on the relevant entity when the output is meant to be reused.
- Keep retrieval separate from generative reasoning where possible.
- Preserve the same authentication and ownership boundaries used by the rest of the app.
- Provide evaluation artifacts for the implemented retrieval behavior.
- Support the job seeker’s workflow without replacing user judgment.

## AI Feature Categories

### Generative And Reasoning Features

Generative/reasoning features call Gemini through the Vercel AI SDK and return text or structured analysis based on saved database context.

Implemented examples:

- Resume critique
- Cover letter critique
- Cover letter generation
- Job posting summary
- Resume/job match
- Resume tailoring suggestions
- Interview prep generation

These features use selected records such as resumes, cover letters, job postings, companies, applications, interviews, and user career context. Outputs are saved to fields such as `Resume.aiFeedback`, `CoverLetter.aiFeedback`, `JobPosting.aiSummary`, `JobPosting.matchAnalysis`, `JobPosting.tailoringSuggestions`, and `Interview.prepNotes`.

### Retrieval And Embedding Features

Retrieval/embedding features represent saved resumes and job postings as vectors and use semantic similarity to rank existing records.

Implemented examples:

- AI retrieval infrastructure
- Semantic Similar Records UI
- Hybrid Job Posting Search
- Hybrid Resume Search
- Semantic Refresh UX
- Semantic test data and retrieval evaluation harness

These features use `gemini-embedding-001` embeddings stored in PostgreSQL through pgvector. Retrieval returns existing app records with approximate similarity scores. It does not generate explanations or rewrite user data.

## Provider And Tooling

- Generative model calls use Google/Gemini through `@ai-sdk/google` and the Vercel AI SDK.
- Generative helper files use `gemini-2.5-flash`.
- Embeddings use `gemini-embedding-001`.
- Embedding vectors are stored as 3072-dimensional pgvector columns.
- PostgreSQL runs on Neon.
- Prisma is used for normal application data access.
- Raw SQL is used where pgvector operations are needed.

Key implementation files:

- `src/lib/ai/*.ts`
- `src/lib/ai/embeddings.ts`
- `src/lib/retrieval/semantic-search.ts`
- `scripts/backfill-embeddings.ts`
- `scripts/seed-semantic-test-data.ts`
- `scripts/evaluate-retrieval.ts`

## User Ownership And Auth Boundaries

AI and retrieval actions run behind the same signed-in user checks as the rest of the app. Server Actions resolve the authenticated user, then read or update records scoped by `userId`.

Retrieval helpers also scope both source records and candidate records by `userId`. Vector search changes ranking, not authorization. A semantically similar record is only eligible if it belongs to the same signed-in user.

## What AI Does Not Do In V1

- It does not browse, fetch, or scrape job posting URLs or company websites.
- It does not run an autonomous agent or tool-calling assistant.
- It does not run a background embedding refresh queue.
- It does not regenerate embeddings automatically on every save.
- It does not use LLM-as-judge evaluation.
- It does not automatically grade generated prose.
- It does not rewrite resumes automatically.
- It does not treat approximate similarity scores as calibrated fit scores.
- It does not automatically submit job applications or contact employers.
- It does not make hiring or suitability decisions on behalf of employers.
- Assistant and tool-calling workflows are planned as the next major AI learning/implementation stage after the current retrieval and evaluation layer.

## Thesis-Defense Summary

JobSeeker AI implements task-specific AI over saved job-search records. Generative features use Gemini through the Vercel AI SDK to critique, summarize, generate, or analyze selected records. Retrieval features use Gemini embeddings stored in PostgreSQL with pgvector to rank saved resumes and job postings by semantic similarity. All AI and retrieval paths remain scoped to the authenticated user's records, so the AI layer extends the existing application model without bypassing authorization.
