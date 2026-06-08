# Retrieval Architecture

This document explains the technical retrieval layer in JobSeeker AI.

The retrieval layer lets the app rank saved resumes and job postings by semantic similarity. It is separate from the generative AI features and from the contextual assistant, although the assistant can benefit from retrieval-related context and read-only tools.

Retrieval returns existing user-owned records. It does not generate new explanations, rewrite user data, browse external URLs, or bypass authorization.

---

## Main Implementation Files

The main implementation files are:

- `src/lib/ai/embeddings.ts`
- `src/lib/retrieval/semantic-search.ts`
- `scripts/backfill-embeddings.ts`
- `scripts/seed-semantic-test-data.ts`
- `scripts/evaluate-retrieval.ts`

Related UI/actions exist on resume and job posting edit/list pages.

---

## Embeddings

An embedding is a numeric vector representation of text. The app uses embeddings so records can be compared by meaning instead of only by exact keyword overlap.

The embedding helper:

- normalizes line endings and trims input text,
- formats selected record fields into stable text blocks,
- generates a vector with Google/Gemini through the Vercel AI SDK,
- validates that the returned vector has the expected length,
- hashes the formatted text with a model/version prefix.

---

## Model And Dimension

The current embedding constants are defined in `src/lib/ai/embeddings.ts`:

- Model: `gemini-embedding-001`
- Dimension: `3072`
- Task type: `SEMANTIC_SIMILARITY`
- Hash version: `embedding:v1:gemini-embedding-001:3072`

The database columns use `vector(3072)`, so generated embeddings must be 3072-dimensional before they can be stored safely.

---

## Stored Embedding Fields

Only `Resume` and `JobPosting` have semantic embedding fields in v1.

`Resume` stores:

- `embedding Unsupported("vector(3072)")?`
- `embeddedAt DateTime?`
- `embeddingTextHash String?`

`JobPosting` stores:

- `embedding Unsupported("vector(3072)")?`
- `embeddedAt DateTime?`
- `embeddingTextHash String?`

The migration that added these fields is:

```txt
prisma/migrations/20260522144841_add_embeddings_retrieval_infrastructure/migration.sql
```

No vector indexes are added in v1.

---

## Why Only Resumes And Job Postings Are Embedded

Resumes and job postings are the main long-text entities where semantic matching is immediately useful.

They support:

- resume-to-job similar records,
- job-to-resume similar records,
- semantic job posting search,
- semantic resume search.

Other entities are not embedded in v1:

- Applications are status/relationship driven.
- Tasks are date/action driven.
- Interviews are date/event driven.
- Companies are useful as context but not central semantic retrieval targets.
- Cover letters may become useful retrieval targets later.

This keeps retrieval focused and easier to evaluate.

---

## Formatted Embedding Text

Resume embedding text includes:

- resume name,
- resume content.

Job posting embedding text includes:

- job title,
- job description,
- location,
- work mode,
- seniority,
- salary,
- company name,
- company industry,
- company notes.

Volatile AI outputs such as summaries, match analysis, and tailoring suggestions are not part of the embedding text.

Reason:

The embedding should represent the user's source record, not downstream AI output that may change over time.

---

## Hash And Staleness Model

`embeddingTextHash` is a SHA-256 hash of:

1. the embedding hash version string,
2. the normalized formatted embedding text.

This means the hash changes when either the source text changes or the embedding version string changes.

When a resume or job posting is edited, the app clears:

- `embeddedAt`
- `embeddingTextHash`

The stored vector column may still contain the previous vector, but semantic queries require both:

```sql
embedding IS NOT NULL
AND embeddingTextHash IS NOT NULL
```

Clearing the hash metadata excludes stale vectors from current semantic retrieval.

---

## Embedding Generation Outcomes

The embedding generation helpers return status values:

- `updated`: a new embedding was generated and stored.
- `skipped_fresh`: the stored embedding and hash are already current.
- `skipped_empty`: the record does not have enough text for embedding.
- `not_found`: the record was not found for that user.

The helpers always scope the selected record by `userId`.

---

## Backfill Script

`scripts/backfill-embeddings.ts` is a bulk maintenance script. It scans existing resumes and job postings, then calls the same embedding generation helpers used by the UI refresh actions.

Run command:

```bash
pnpm backfill:embeddings
```

The script is useful after:

- adding embedding columns,
- seeding semantic test data,
- changing embedding text formatting,
- changing embedding model/version.

It is not run automatically by the app, and it is not part of normal page rendering.

---

## Semantic Refresh UX

The app provides per-record semantic refresh actions on resume and job posting edit pages.

When a record has been edited and its semantic data is stale, the UI shows:

```txt
Update semantic data
```

The action:

- verifies the signed-in user,
- calls the relevant embedding generation helper,
- updates the embedding, timestamp, and hash when needed,
- reports whether semantic data was updated, already fresh, empty, or failed.

This keeps product UI focused on user actions instead of telling users to run `pnpm backfill:embeddings`. The backfill script remains available for development and bulk maintenance.

---

## Similar Records

Similar-record helpers compare one saved source record against the user's saved candidate records:

- `findSimilarJobPostingsToResume`
- `findSimilarResumesToJobPosting`

The helpers use pgvector cosine distance:

```sql
embedding <=> source.embedding
```

Similarity is returned as:

```txt
1 - distance
```

The UI presents scores as approximate semantic similarity. These scores are not calibrated job-fit probabilities.

---

## Hybrid Search

This is a hybrid search interface, not a fully blended hybrid ranking system.

Hybrid search is implemented as an explicit mode choice, not a blended ranking algorithm.

Job postings:

- Keyword mode searches saved job and company text fields with normal database filters.
- Semantic mode embeds the query and ranks stored `JobPosting.embedding` values.
- Work mode and company filters apply in semantic mode.

Resumes:

- Keyword mode searches resume name and content.
- Semantic mode embeds the query and ranks stored `Resume.embedding` values.
- No structured resume filters are implemented in v1.

Semantic search falls back to keyword results if the semantic query path fails.

---

## Top-5 Semantic Results

Semantic list search uses a small top-N result set in the UI. The app currently shows the closest semantic results and disables normal pagination for semantic mode.

This is intentional because vector search can rank every embedded record, including weak tail results. Showing a small set avoids presenting low-similarity tail records as equally meaningful recommendations.

The helper layer supports bounded limits up to 20, but the current UI uses a top-5 style presentation for semantic result sets.

---

## No Hard Similarity Threshold Yet

The current implementation does not enforce a hard similarity cutoff. Results are ordered by distance and displayed with approximate similarity scores.

A threshold may be added later after collecting more data about score distributions and user expectations. Until then, top-N ranking is easier to inspect and evaluate.

---

## User Ownership

Every retrieval path preserves user ownership:

- source records are filtered by `userId`,
- candidate records are filtered by `userId`,
- job posting queries also verify the linked company belongs to the same user,
- Server Actions call retrieval helpers only after resolving the signed-in user.

Vector search changes how eligible records are ranked. It does not change which records are eligible.

---

## Relationship To The Assistant

The contextual assistant is a separate read-only AI layer, but it can use retrieval-adjacent concepts:

- saved resumes and job postings,
- semantic data availability,
- read-only search/retrieval tools,
- page-aware context for current resume/job/application,
- trusted record references.

The assistant does not bypass retrieval authorization rules. Any record used by assistant context or tools must still be scoped to the signed-in user.

Formal assistant evaluation is future work; retrieval evaluation remains focused on semantic search and similar-record helpers.

---

## Future Background Refresh

The current app uses manual refresh and bulk backfill. A future production version could add a background job queue that regenerates stale embeddings after edits.

That would preserve the current staleness model while removing the need for manual per-record refresh.

The current manual refresh action is intentionally simpler than a background queue because it avoids adding job infrastructure while still preventing stale semantic data from being used.

---

## Thesis-Defense Explanations

Embedding:

```txt
An embedding is a vector representation of text. JobSeeker AI uses embeddings so resumes and job postings can be compared by meaning, even when they do not use the exact same keywords.
```

pgvector:

```txt
The app stores Gemini embeddings in PostgreSQL using pgvector. This keeps semantic retrieval inside the same user-owned data store as the rest of the application.
```

Authorization:

```txt
Vector search only changes ranking. It does not bypass authorization. All semantic retrieval queries still filter source and candidate records by userId.
```

Staleness:

```txt
When a resume or job posting changes, the app clears its embedding metadata. That prevents stale vectors from being used until semantic data is refreshed.
```

Backfill:

```txt
The backfill script separates schema changes from external AI API calls. It can regenerate embeddings for existing records without coupling migrations to model calls.
```

Assistant relationship:

```txt
The assistant can use saved records and read-only tools, but retrieval and assistant context remain user-scoped. The assistant does not gain access to records that semantic retrieval would not be allowed to return.
```
