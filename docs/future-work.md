# Future Work

This document lists deferred improvements that are not part of the current v1 implementation.

## Retrieval And Embeddings

- Add a background embedding refresh queue after resume or job posting edits.
- Polish the user-facing semantic refresh flow, including clearer stale/fresh states and retry behavior.
- Add vector indexes such as HNSW or IVFFlat only after measuring record volume and query performance.
- Explore blended hybrid ranking that combines keyword, structured filters, and vector similarity into one ranked result set.
- Evaluate PostgreSQL full-text search or `tsvector` for stronger keyword search where it materially improves current `contains` filters.
- Add similarity score calibration or thresholds only after collecting more retrieval examples.

## Assistant And Tool-Calling Roadmap

- Implement a read-only contextual assistant v1 that answers questions using saved user records.
- Use retrieval and hybrid search as the grounding layer for assistant responses.
- Plan tool-calling / agentic assistant architecture after the read-only assistant.
- Start with read-only tools before any write/action-taking tools.
- Define typed tool schemas, permission boundaries, confirmation UX, and error handling before write tools.
- Require citations or record references when assistant responses use saved data.

## Evaluation

- Expand the semantic evaluation dataset beyond the current controlled synthetic set.
- Add more cases for ambiguous, cross-cluster, and near-duplicate records.
- Keep manual rubric evaluation as the baseline for generated prose.
- Consider LLM-as-judge only after a manual rubric baseline exists and the added model-dependence is worth the tradeoff.
- Add richer report history instead of only a latest markdown report.

## AI Product Features

- Split `Interview.prepNotes` into separate generated prep notes and personal notes fields.
- Add resume/job match history or support multiple saved comparisons per job posting.
- Add dedicated resume versioning and richer cover letter version workflow polish.
- Improve generated-output review UX, including clearer timestamps and refresh behavior.
- Consider URL fetching or scraping only as a separate, explicitly designed feature with safety, privacy, reliability, and attribution constraints.

## Auth, Files, And Product Polish

- Add OAuth as an auth enhancement if it adds enough user value beyond email/password.
- Add an authenticated private PDF download/view route for stored resume PDFs.
- Add cleanup for old Blob files when replacing resume PDFs.
- Improve scanned/image-only PDF handling.
- Improve inline form error handling.
- Add success/error toasts where they improve feedback.
- Add fuller authenticated CRUD E2E tests.
- Add more complete loading and skeleton states.
- Improve dashboard analytics and job-search status summaries.
- Add application pipeline/status visualization on `/applications`.
