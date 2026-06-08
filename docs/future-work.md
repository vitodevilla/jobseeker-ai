# Future Work

This document lists deferred improvements that are not part of the current implementation.

The current implementation already includes task-specific AI, semantic retrieval, retrieval evaluation, a read-only contextual assistant, read-only assistant tools, page-aware context, trusted references, and a global assistant shell.

Future work should extend that foundation without confusing deferred product ideas with required thesis scope.

---

## Assistant And Tool-Calling

Implemented for the current version:

- read-only contextual assistant,
- read-only assistant tools,
- page-aware context,
- source registry / trusted references,
- global assistant shell.

Deferred improvements:

- Add database-persisted assistant chat threads.
- Add per-record or per-route assistant thread history.
- Add assistant evaluation cases for source correctness, tool use, and page-aware context.
- Add write-capable tools only with explicit confirmation UX.
- Define typed write-tool schemas and permission boundaries.
- Add audit logging for assistant actions.
- Add undo/error handling where write actions are reversible.
- Evaluate which actions should never be automated.

Possible future write tools:

- create task,
- update application status,
- draft cover letter,
- refresh semantic data,
- generate interview prep,
- schedule a reminder.

---

## Retrieval And Embeddings

- Add a background embedding refresh queue after resume or job posting edits.
- Polish the user-facing semantic refresh flow, including clearer stale/fresh states and retry behavior.
- Add vector indexes such as HNSW or IVFFlat only after measuring record volume and query performance.
- Explore blended hybrid ranking that combines keyword, structured filters, and vector similarity into one ranked result set.
- Evaluate PostgreSQL full-text search or `tsvector` for stronger keyword search where it materially improves current filters.
- Add similarity score calibration or thresholds only after collecting more retrieval examples.
- Expand semantic retrieval to additional entities if useful, such as cover letters, application notes, or company notes.

---

## Evaluation

- Expand the semantic evaluation dataset beyond the current controlled synthetic set.
- Add more ambiguous, cross-cluster, and near-duplicate records.
- Keep manual rubric evaluation as the baseline for generated prose.
- Save generated-output evaluation score sheets.
- Consider LLM-as-judge only after a manual rubric baseline exists and the added model-dependence is worth the tradeoff.
- Add richer report history instead of only a latest markdown report.
- Add assistant-specific evaluation cases.
- Add source/citation precision checks for assistant answers.
- Add page-context correctness checks for assistant behavior.
- Add tool-call behavior tests.

---

## AI Product Features

- Split `Interview.prepNotes` into separate generated prep notes and personal notes fields.
- Add resume/job match history or support multiple saved comparisons per job posting.
- Add dedicated resume versioning and richer cover letter version workflow polish.
- Improve generated-output review UX, including clearer timestamps and refresh behavior.
- Consider URL fetching or scraping only as a separate, explicitly designed feature with safety, privacy, reliability, and attribution constraints.
- Add optional resume-tailoring draft generation only with explicit user confirmation.

---

## Auth, Files, And Account Management

- Add OAuth as an auth enhancement if it adds enough user value beyond email/password.
- Add an authenticated private PDF download/view route for stored resume PDFs.
- Add cleanup for old Blob files when replacing resume PDFs.
- Improve scanned/image-only PDF handling.
- Add account deletion and data export flows.
- Improve sign-in callback behavior for protected route redirects.

---

## Product Polish

- Improve inline form error handling.
- Add success/error toasts where they improve feedback.
- Add more complete loading and skeleton states.
- Add fuller authenticated CRUD E2E tests.
- Improve dashboard analytics and job-search status summaries.
- Add application pipeline/status visualization on `/applications`.
- Add optional Kanban-style application board.
- Improve mobile QA coverage.
- Prepare final screenshots, demo script, and thesis/defense assets.

---

## Integrations And Real-Product Expansion

Potential product extensions:

- job import from URL,
- browser extension or share target,
- Gmail/email integration,
- Google Calendar integration,
- notification/reminder system,
- resume builder/export,
- analytics/coaching dashboard,
- billing/account plans if ever commercialized.

These are intentionally outside the current thesis implementation scope.
