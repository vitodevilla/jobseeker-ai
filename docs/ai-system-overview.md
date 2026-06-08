# AI System Overview

This document is the technical overview of the implemented AI system in JobSeeker AI.

It documents the app-repo view of the system: implemented behavior, core files, ownership boundaries, and current non-goals. Thesis prose and personal working notes belong in the separate `~/zavrsni` workspace.

---

## What JobSeeker AI Is

JobSeeker AI is a full-stack job-search tracker. It stores user-owned records for resumes, companies, job postings, applications, cover letters, interviews, and tasks.

The AI layer works on top of those saved records. It is not a generic chatbot and not an autonomous agent. It is a set of grounded AI, retrieval, and assistant features connected to concrete app workflows.

The current implemented AI system includes:

- task-specific generative AI features,
- semantic retrieval with embeddings and pgvector,
- semantic refresh UX,
- retrieval evaluation support,
- a read-only contextual assistant,
- read-only assistant tools,
- page-aware assistant context,
- trusted source references,
- a global assistant shell.

---

## AI System Goals

- Use saved app records as context for AI outputs.
- Keep AI actions explicit and user-triggered.
- Store useful generated outputs on the relevant entity when the output is meant to be reused.
- Keep retrieval separate from generative reasoning where possible.
- Preserve authentication and ownership boundaries across AI, retrieval, and assistant flows.
- Provide evaluation artifacts for retrieval behavior.
- Support the job seeker’s workflow without replacing user judgment.
- Keep the assistant read-only in the current implementation.
- Treat write-capable agent behavior as future work.

---

## AI Feature Categories

### 1. Generative And Reasoning Features

Generative/reasoning features call Gemini through the Vercel AI SDK and return text or structured analysis based on saved database context.

Implemented examples:

- Resume critique
- Cover letter critique
- Cover letter generation
- Job posting summary
- Resume/job match
- Resume tailoring suggestions
- Interview prep generation

These features use selected records such as resumes, cover letters, job postings, companies, applications, interviews, and user career context.

Outputs are saved to fields such as:

- `Resume.aiFeedback`
- `CoverLetter.aiFeedback`
- `JobPosting.aiSummary`
- `JobPosting.matchAnalysis`
- `JobPosting.tailoringSuggestions`
- `Interview.prepNotes`

Generative outputs are rendered through safe Markdown rendering where appropriate.

---

### 2. Retrieval And Embedding Features

Retrieval/embedding features represent saved resumes and job postings as vectors and use semantic similarity to rank existing records.

Implemented examples:

- AI retrieval infrastructure
- Semantic Similar Records UI
- Hybrid Job Posting Search
- Hybrid Resume Search
- Semantic Refresh UX
- Semantic test data and retrieval evaluation harness

These features use `gemini-embedding-001` embeddings stored in PostgreSQL through pgvector. Retrieval returns existing app records with approximate similarity scores. It does not generate explanations or rewrite user data.

---

### 3. Evaluation Support

The project includes evaluation support for AI/retrieval behavior.

Implemented evaluation support:

- manual rubric for generated AI outputs,
- controlled semantic test data,
- retrieval evaluation cases,
- `scripts/evaluate-retrieval.ts`,
- latest markdown evaluation report.

The retrieval evaluation script checks the same retrieval helpers used by the app and reports top-k behavior over a controlled synthetic dataset.

---

### 4. Read-Only Contextual Assistant

The app includes a read-only contextual assistant.

The assistant can answer questions using:

- authenticated base context,
- current page context,
- read-only tool results,
- trusted source references.

The assistant is intentionally read-only. It can retrieve and summarize saved data, but it cannot create, update, delete, send, schedule, or submit anything.

Implemented assistant concepts:

- contextual assistant Server Action,
- two-call assistant flow,
- read-only tools,
- source registry,
- trusted source filtering,
- referenced records,
- page-aware context,
- global assistant shell,
- page-level assistant cards.

---

## Provider And Tooling

- Generative model calls use Google/Gemini through `@ai-sdk/google` and the Vercel AI SDK.
- Generative helper files use `gemini-2.5-flash`.
- Embeddings use `gemini-embedding-001`.
- Embedding vectors are stored as 3072-dimensional pgvector columns.
- PostgreSQL runs on Neon.
- Prisma is used for normal application data access.
- Raw SQL is used where pgvector operations are needed.
- Safe Markdown rendering is used for read-only AI output display.

Key implementation areas:

- `src/lib/ai/*.ts`
- `src/lib/ai/embeddings.ts`
- `src/lib/retrieval/semantic-search.ts`
- assistant Server Actions under the app assistant area
- assistant context/tool modules under `src/lib/ai/assistant` or equivalent assistant-support paths
- `scripts/backfill-embeddings.ts`
- `scripts/seed-semantic-test-data.ts`
- `scripts/evaluate-retrieval.ts`

---

## User Ownership And Auth Boundaries

AI and retrieval actions run behind the same signed-in user checks as the rest of the app.

Server Actions resolve the authenticated user, then read or update records scoped by `userId`.

Retrieval helpers scope both source records and candidate records by `userId`.

Vector search changes ranking, not authorization. A semantically similar record is only eligible if it belongs to the same signed-in user.

Assistant tools also run server-side inside the authenticated user scope. The model does not provide trusted ownership parameters.

---

## Page-Aware Assistant Boundaries

The assistant can receive lightweight page context, such as the current resume, job posting, or application.

The client may help describe the current route/page, but the server resolves the actual record and verifies ownership before including it in assistant context.

Important rule:

> Page awareness improves UX, but authorization remains server-side.

---

## Source Registry And Referenced Records

Assistant answers may include source keys for records used in the response.

The server filters those keys against a trusted source map before returning referenced records to the UI.

This prevents the model from inventing valid-looking references.

The final displayed referenced records are:

- deduplicated,
- filtered against trusted sources,
- capped before display.

---

## What AI Does Not Do In The Current Implementation

- It does not browse, fetch, or scrape job posting URLs or company websites.
- It does not automatically submit job applications.
- It does not contact employers.
- It does not make hiring decisions.
- It does not rewrite resumes automatically.
- It does not regenerate embeddings automatically on every save.
- It does not run a background embedding refresh queue.
- It does not use LLM-as-judge evaluation.
- It does not automatically grade generated prose.
- It does not treat approximate similarity scores as calibrated fit scores.
- It does not persist assistant chat threads.
- It does not expose write-capable assistant tools.

---

## Thesis-Defense Summary

JobSeeker AI implements a staged AI system over saved job-search records. Generative features use Gemini through the Vercel AI SDK to critique, summarize, generate, or analyze selected records. Retrieval features use Gemini embeddings stored in PostgreSQL with pgvector to rank saved resumes and job postings by semantic similarity. Evaluation support provides a manual generative rubric and a retrieval evaluation harness over controlled semantic test data. The read-only contextual assistant uses saved records, page-aware context, read-only tools, and trusted references without bypassing authorization or modifying user data.
